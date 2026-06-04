-- Batch wine catalog lookup
-- Replaces N parallel lookup_wine() calls with a single round-trip.
-- Used by the scan API to enrich all wines at once.

CREATE OR REPLACE FUNCTION public.lookup_wines_batch(
  p_names     TEXT[],
  p_vintages  INT[],        -- use INT to avoid JS coercion issues; compared as SMALLINT
  p_threshold FLOAT DEFAULT 0.25
)
RETURNS TABLE (
  input_index   INT,
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
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_i       INT;
  v_name    TEXT;
  v_vintage INT;
BEGIN
  IF array_length(p_names, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR v_i IN 1..array_length(p_names, 1) LOOP
    v_name    := p_names[v_i];
    v_vintage := p_vintages[v_i];

    RETURN QUERY
    SELECT
      v_i,
      wc.id,
      similarity(wc.name, v_name),
      wc.name,
      wc.producer,
      wc.vintage,
      wc.region,
      wc.country,
      wc.grape,
      wc.color,
      wc.critic_score,
      wc.vivino_rating,
      wc.quality_score,
      wc.body,
      wc.sweetness,
      wc.tannin,
      wc.acidity,
      wc.price_usd
    FROM public.wine_catalog wc
    WHERE similarity(wc.name, v_name) > p_threshold
      AND (v_vintage IS NULL OR wc.vintage IS NULL OR wc.vintage = v_vintage::SMALLINT)
    ORDER BY similarity(wc.name, v_name) DESC
    LIMIT 1;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.lookup_wines_batch IS
  'Batch trigram lookup for multiple wine names. Loops through each input and '
  'returns the best catalog match for each, using the same GIN index as lookup_wine(). '
  'Far more efficient than N parallel RPC calls from the application layer.';
