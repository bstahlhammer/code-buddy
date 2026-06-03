/**
 * wineCatalog.ts
 * ──────────────
 * Looks up scanned wine names against the Supabase wine_catalog table
 * to enrich them with quality_score, palate axes, and metadata.
 *
 * The catalog is seeded from Kaggle Wine Enthusiast (~130k wines) and
 * HuggingFace WineSensed (~350k+ vintages from Vivino).
 *
 * Quality scores use an honest 0-100 scale:
 *   ≥ 85  → confident pick
 *   70-84 → decent, not a standout
 *   < 70  → wouldn't order for you
 */

import { supabase } from '@/integrations/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatalogMatch {
  catalogId:     number
  similarity:    number   // 0-1 trigram similarity
  name:          string
  producer:      string | null
  vintage:       number | null
  region:        string | null
  country:       string | null
  grape:         string | null
  color:         string | null
  criticScore:   number | null   // raw Wine Enthusiast 0-100
  vivinoRating:  number | null   // raw Vivino 0-5
  qualityScore:  number | null   // honest remapped 0-100
  body:          number | null
  sweetness:     number | null
  tannin:        number | null
  acidity:       number | null
  priceUsd:      number | null
}

export interface WineEnrichment {
  qualityScore:  number          // 0-100 honest scale; 50 = unknown
  body:          number          // 0-100; 50 = unknown
  sweetness:     number
  tannin:        number
  acidity:       number
  catalogMatch:  CatalogMatch | null
  confidence:    'catalog' | 'inferred' | 'unknown'
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

/**
 * Look up a single wine name (+ optional vintage year) in the catalog.
 * Returns the best match or null if no match exceeds the similarity threshold.
 *
 * Uses the `lookup_wine` Postgres function which applies pg_trgm matching.
 */
export async function lookupWine(
  name: string,
  vintage?: number | null,
  threshold = 0.35,
): Promise<CatalogMatch | null> {
  const { data, error } = await supabase.rpc('lookup_wine', {
    p_name:      name,
    p_vintage:   vintage ?? null,
    p_threshold: threshold,
  })

  if (error) {
    console.error('[wineCatalog] lookup_wine error:', error.message)
    return null
  }

  if (!data || data.length === 0) return null

  const row = data[0]
  return {
    catalogId:    row.catalog_id,
    similarity:   row.similarity,
    name:         row.name,
    producer:     row.producer,
    vintage:      row.vintage,
    region:       row.region,
    country:      row.country,
    grape:        row.grape,
    color:        row.color,
    criticScore:  row.critic_score,
    vivinoRating: row.vivino_rating,
    qualityScore: row.quality_score,
    body:         row.body,
    sweetness:    row.sweetness,
    tannin:       row.tannin,
    acidity:      row.acidity,
    priceUsd:     row.price_usd,
  }
}

/**
 * Enrich a batch of scanned wines with catalog data in parallel.
 * Falls back gracefully: if a wine isn't in the catalog, palate axes
 * from Claude's scan inference are used and qualityScore defaults to 50.
 *
 * @param wines  Array of wines as returned by the scan API
 * @returns      Same array with enrichment fields merged in
 */
export async function enrichScannedWines<T extends {
  name:       string
  vintage?:   string | number | null
  body?:      number
  sweetness?: number
  tannin?:    number
  acidity?:   number
}>(wines: T[]): Promise<(T & WineEnrichment)[]> {
  const results = await Promise.all(
    wines.map(async (wine) => {
      const vintageNum = wine.vintage
        ? parseInt(String(wine.vintage), 10) || null
        : null

      const match = await lookupWine(wine.name, vintageNum)

      let enrichment: WineEnrichment

      if (match && match.qualityScore !== null) {
        enrichment = {
          qualityScore: match.qualityScore,
          body:         match.body      ?? wine.body      ?? 50,
          sweetness:    match.sweetness ?? wine.sweetness ?? 50,
          tannin:       match.tannin    ?? wine.tannin    ?? 50,
          acidity:      match.acidity   ?? wine.acidity   ?? 50,
          catalogMatch: match,
          confidence:   'catalog',
        }
      } else if (
        wine.body != null && wine.sweetness != null &&
        wine.tannin != null && wine.acidity != null
      ) {
        // Claude inferred palate axes during scan — trust them, but quality is unknown
        enrichment = {
          qualityScore: 50,   // neutral; UI should show "quality unknown"
          body:         wine.body,
          sweetness:    wine.sweetness,
          tannin:       wine.tannin,
          acidity:      wine.acidity,
          catalogMatch: match,
          confidence:   'inferred',
        }
      } else {
        enrichment = {
          qualityScore: 50,
          body:         50,
          sweetness:    50,
          tannin:       50,
          acidity:      50,
          catalogMatch: null,
          confidence:   'unknown',
        }
      }

      return { ...wine, ...enrichment }
    })
  )

  return results
}

// ─── Quality tier helpers (used by UI and match engine) ───────────────────────

export type QualityTier = 'confident' | 'decent' | 'poor' | 'unknown'

/**
 * Classify a quality score into a display tier.
 * The thresholds are the defaults; the user's profile quality setting
 * (userQualityThreshold) overrides the 'confident' cutoff.
 */
export function qualityTier(
  score: number | null | undefined,
  userQualityThreshold = 85,
): QualityTier {
  if (score == null) return 'unknown'
  if (score >= userQualityThreshold) return 'confident'
  if (score >= 70)                   return 'decent'
  return 'poor'
}

/**
 * Human-readable label for a quality score, shown in the UI.
 * Thresholds mirror the honest 0-100 remap (WE 90 → 74, WE 92 → 84, WE 95 → 94).
 */
export function qualityLabel(score: number | null | undefined): string {
  if (score == null) return 'Quality unknown'
  if (score >= 94)   return 'Extraordinary'
  if (score >= 88)   return 'Outstanding'
  if (score >= 84)   return 'Highly rated'
  if (score >= 74)   return 'Solid everyday wine'
  if (score >= 60)   return 'Decent, not a standout'
  if (score >= 45)   return 'Below average'
  return 'Poor quality'
}
