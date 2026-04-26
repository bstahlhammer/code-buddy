import { RATING_BUCKETS } from '../data/mockData.js'

const bucketById = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, b]))

/**
 * Compute match score 0–100 between a wine and a taste profile.
 * Body and tannin are weighted 2×; sweetness and acidity 1×.
 *
 * Rated wines get a bucket-specific score delta (loved +35 … hated -35).
 * Legacy `lovedWineIds` / `hatedWineIds` arrays are still supported for
 * older callers and treated as 'loved' / 'hated' respectively.
 *
 * @param {{ id: number, body: number, sweetness: number, tannin: number, acidity: number }} wine
 * @param {{
 *   palate: { body, sweetness, tannin, acidity },
 *   ratingsByBucket?: Record<string, number[]>,
 *   lovedWineIds?: number[],
 *   hatedWineIds?: number[]
 * }} tasteProfile
 * @returns {number} 0–100
 */
export function computeMatch(wine, tasteProfile) {
  if (!tasteProfile || !tasteProfile.palate) return wine.match ?? 50

  const p = tasteProfile.palate
  const dist =
    Math.abs(wine.body      - p.body)      * 2 +
    Math.abs(wine.tannin    - p.tannin)    * 2 +
    Math.abs(wine.sweetness - p.sweetness) * 1 +
    Math.abs(wine.acidity   - p.acidity)   * 1

  const maxDist = 600
  let score = Math.round(100 - (dist / maxDist) * 100)

  // Per-bucket deltas
  const byBucket = tasteProfile.ratingsByBucket
  if (byBucket) {
    for (const bucket of RATING_BUCKETS) {
      const ids = byBucket[bucket.id]
      if (ids && ids.includes(wine.id)) {
        score += bucket.matchDelta
      }
    }
  }

  // Legacy arrays
  if (tasteProfile.lovedWineIds?.includes(wine.id)) {
    score += bucketById.loved.matchDelta
  }
  if (tasteProfile.hatedWineIds?.includes(wine.id)) {
    score += bucketById.hated.matchDelta
  }

  return Math.max(0, Math.min(100, score))
}
