import { wineSearchDb, tasteProfiles, RATING_BUCKETS } from '../data/mockData.js'

const AXES = ['body', 'sweetness', 'tannin', 'acidity']
const NEUTRAL_PALATE = { body: 50, sweetness: 30, tannin: 40, acidity: 55 }

const bucketById = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, b]))
const wineById   = Object.fromEntries(wineSearchDb.map(w => [w.id, w]))

/**
 * Infer a palate from a map of { wineId: bucketId } ratings.
 *
 * Math: each rated wine contributes a vector in palate space. Positive
 * buckets (loved/liked) pull the centroid toward the wine; negative buckets
 * (disliked/hated) push it away (mirror around the neutral palate). 'ok'
 * contributes nothing. The result is the weighted average of all contributions
 * blended with the neutral baseline so a single rating doesn't dominate.
 *
 * @param {Record<number, string>} ratings  e.g. { 3: 'loved', 27: 'hated' }
 * @returns {{
 *   palate: { body, sweetness, tannin, acidity },
 *   confidence: number,             // 0..1, grows with signal volume
 *   ratedCount: number,
 *   bucketCounts: Record<string, number>
 * }}
 */
export function inferPalateFromRatings(ratings) {
  const entries = Object.entries(ratings || {})
    .map(([id, bucketId]) => ({ wine: wineById[Number(id)], bucket: bucketById[bucketId] }))
    .filter(e => e.wine && e.bucket)

  const bucketCounts = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, 0]))
  for (const e of entries) bucketCounts[e.bucket.id]++

  if (entries.length === 0) {
    return { palate: { ...NEUTRAL_PALATE }, confidence: 0, ratedCount: 0, bucketCounts }
  }

  const acc = { body: 0, sweetness: 0, tannin: 0, acidity: 0 }
  let totalWeight = 0

  for (const { wine, bucket } of entries) {
    const absW = Math.abs(bucket.weight)
    if (absW === 0) continue
    for (const axis of AXES) {
      const v = wine[axis]
      // Negative weight: mirror the wine's value around the neutral palate so
      // hating a 90-tannin wine pulls the inferred palate toward low tannin.
      const contribution = bucket.weight > 0
        ? v
        : 2 * NEUTRAL_PALATE[axis] - v
      acc[axis] += contribution * absW
    }
    totalWeight += absW
  }

  const palate = {}
  for (const axis of AXES) {
    if (totalWeight === 0) {
      palate[axis] = NEUTRAL_PALATE[axis]
    } else {
      // Blend toward neutral baseline by adding a soft prior; this keeps a
      // single rating from yanking the profile to an extreme.
      const prior = NEUTRAL_PALATE[axis]
      const priorWeight = 1.5
      palate[axis] = Math.round(
        (acc[axis] + prior * priorWeight) / (totalWeight + priorWeight)
      )
      palate[axis] = Math.max(0, Math.min(100, palate[axis]))
    }
  }

  // Confidence asymptotes to 1 as totalWeight grows. ~5 strong ratings ≈ 0.8.
  const confidence = Math.min(1, totalWeight / 12)

  return { palate, confidence, ratedCount: entries.length, bucketCounts }
}

/** Find the closest archetype to a given palate. */
export function nearestTasteProfile(palate) {
  let best = tasteProfiles[0]
  let bestDist = Infinity
  for (const profile of tasteProfiles) {
    const p = profile.palate
    const dist = Math.sqrt(
      AXES.reduce((s, axis) => s + (palate[axis] - p[axis]) ** 2, 0)
    )
    if (dist < bestDist) { bestDist = dist; best = profile }
  }
  return best
}

/** Group rating IDs by bucket — convenient shape for the match engine. */
export function groupRatingsByBucket(ratings) {
  const out = Object.fromEntries(RATING_BUCKETS.map(b => [b.id, []]))
  for (const [id, bucketId] of Object.entries(ratings || {})) {
    if (out[bucketId]) out[bucketId].push(Number(id))
  }
  return out
}
