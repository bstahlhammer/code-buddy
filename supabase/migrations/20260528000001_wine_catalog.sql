-- Enable trigram extension for fuzzy name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- wine_catalog
-- Read-only reference table populated by the import script.
-- Not user-specific, no RLS needed — all reads are public.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.wine_catalog (
  id              BIGSERIAL PRIMARY KEY,

  -- Identity
  name            TEXT        NOT NULL,
  producer        TEXT,
  vintage         SMALLINT,                        -- NULL = NV
  region          TEXT,
  country         TEXT,
  grape           TEXT,                            -- variety or blend description
  color           TEXT        CHECK (color IN (
                    'red','white','rosé','sparkling','dessert','fortified','unknown'
                  )),

  -- Raw ratings from sources
  critic_score    SMALLINT    CHECK (critic_score BETWEEN 0 AND 100),   -- Wine Enthusiast 0-100
  vivino_rating   NUMERIC(3,2) CHECK (vivino_rating BETWEEN 0 AND 5),   -- Vivino 0.00-5.00

  -- Remapped honest quality score (0-100).
  -- Derived at import time via the mapping curve:
  --   critic 80  → 23,  critic 85 → 48,  critic 90 → 74,
  --   critic 92  → 84,  critic 95 → 94,  critic 99 → 99
  -- Vivino 4.0 → 75, 4.2 → 84, 4.4 → 91, 4.7 → 97
  quality_score   SMALLINT    CHECK (quality_score BETWEEN 0 AND 100),

  -- Palate profile (0-100 each) — inferred from grape/style at import
  body            SMALLINT    CHECK (body        BETWEEN 0 AND 100),
  sweetness       SMALLINT    CHECK (sweetness   BETWEEN 0 AND 100),
  tannin          SMALLINT    CHECK (tannin      BETWEEN 0 AND 100),
  acidity         SMALLINT    CHECK (acidity     BETWEEN 0 AND 100),

  -- Additional metadata
  price_usd       NUMERIC(8,2),
  alcohol_pct     NUMERIC(4,1),
  description     TEXT,                            -- tasting note / review snippet

  -- Source provenance
  source          TEXT        NOT NULL DEFAULT 'unknown',
                  -- 'kaggle_wine_enthusiast' | 'huggingface_winesensed' | 'manual'
  source_id       TEXT,                            -- original row id in source dataset

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Search indexes ────────────────────────────────────────────────────────────

-- Full-text search (English) on name + producer + region
ALTER TABLE public.wine_catalog
  ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(name, '')      || ' ' ||
      COALESCE(producer, '')  || ' ' ||
      COALESCE(region, '')    || ' ' ||
      COALESCE(country, '')   || ' ' ||
      COALESCE(grape, '')
    )
  ) STORED;

CREATE INDEX idx_wine_catalog_fts      ON public.wine_catalog USING GIN(fts);

-- Trigram index for fuzzy wine-name lookup from scan results
CREATE INDEX idx_wine_catalog_name_trgm
  ON public.wine_catalog USING GIN(name gin_trgm_ops);

-- Quality filtering
CREATE INDEX idx_wine_catalog_quality  ON public.wine_catalog(quality_score);
CREATE INDEX idx_wine_catalog_color    ON public.wine_catalog(color);
CREATE INDEX idx_wine_catalog_source   ON public.wine_catalog(source);

-- Deduplication guard: same name + producer + vintage is one wine
CREATE UNIQUE INDEX idx_wine_catalog_identity
  ON public.wine_catalog(
    LOWER(TRIM(name)),
    LOWER(TRIM(COALESCE(producer, ''))),
    COALESCE(vintage, 0)
  );

-- ─── Lookup function ──────────────────────────────────────────────────────────
-- Returns the best catalog match for a raw scanned wine name.
-- Uses trigram similarity; returns NULL when no match scores > 0.35.
CREATE OR REPLACE FUNCTION public.lookup_wine(
  p_name      TEXT,
  p_vintage   SMALLINT DEFAULT NULL,
  p_threshold FLOAT    DEFAULT 0.35
)
RETURNS TABLE (
  catalog_id    BIGINT,
  similarity    FLOAT,
  name          TEXT,
  producer      TEXT,
  vintage       SMALLINT,
  region        TEXT,
  country       TEXT,
  grape         TEXT,
  color         TEXT,
  critic_score  SMALLINT,
  vivino_rating NUMERIC,
  quality_score SMALLINT,
  body          SMALLINT,
  sweetness     SMALLINT,
  tannin        SMALLINT,
  acidity       SMALLINT,
  price_usd     NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    wc.id                                        AS catalog_id,
    similarity(wc.name, p_name)                  AS similarity,
    wc.name, wc.producer, wc.vintage,
    wc.region, wc.country, wc.grape, wc.color,
    wc.critic_score, wc.vivino_rating, wc.quality_score,
    wc.body, wc.sweetness, wc.tannin, wc.acidity,
    wc.price_usd
  FROM public.wine_catalog wc
  WHERE
    similarity(wc.name, p_name) > p_threshold
    -- When a vintage is supplied, prefer exact match but allow ±1 year
    AND (
      p_vintage IS NULL
      OR wc.vintage IS NULL
      OR ABS(wc.vintage - p_vintage) <= 1
    )
  ORDER BY
    -- Boost exact vintage match
    CASE WHEN wc.vintage = p_vintage THEN 1 ELSE 0 END DESC,
    similarity(wc.name, p_name) DESC
  LIMIT 3;
$$;

COMMENT ON TABLE  public.wine_catalog IS
  'Global wine reference catalog seeded from Kaggle Wine Enthusiast (130k) and HuggingFace WineSensed (824k Vivino reviews). Used to enrich scanned wines with quality_score and palate axes.';

COMMENT ON COLUMN public.wine_catalog.quality_score IS
  'Honest 0-100 quality score remapped from raw critic/community ratings. 85+ = confident pick, 70-84 = decent, <70 = not recommended.';

COMMENT ON FUNCTION public.lookup_wine IS
  'Fuzzy-match a scanned wine name against the catalog. Returns up to 3 candidates ordered by trigram similarity. Call from the scan edge function to enrich each detected wine.';
