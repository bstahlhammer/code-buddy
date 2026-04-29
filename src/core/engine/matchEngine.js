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

/**
 * Plain-language explanation of WHY a wine has a given match score.
 * Compares the wine's palate axes to the user's profile and surfaces the
 * 1-2 axes that drive the score most.
 *
 * Returns { headline, axes, archetype } where:
 *   headline  — short sentence (e.g. "Closest to your Bold-and-Brooding palate.")
 *   axes      — string list of axis-level alignment notes
 *   archetype — clean profile name without "The "
 */
export function explainMatch(wine, tasteProfile) {
  if (!tasteProfile?.palate || !wine) {
    return { headline: 'Take a quick taste profile to see your match.', axes: [], archetype: null }
  }
  const archetype = tasteProfile.name?.replace(/^The\s+/i, '') || 'palate'
  const p = tasteProfile.palate

  const axisInfo = [
    { key: 'body',      label: 'body',       w: wine.body,      u: p.body,      lo: 'lighter',     hi: 'fuller'  },
    { key: 'tannin',    label: 'tannins',    w: wine.tannin,    u: p.tannin,    lo: 'softer',      hi: 'firmer'  },
    { key: 'acidity',   label: 'acidity',    w: wine.acidity,   u: p.acidity,   lo: 'rounder',     hi: 'crisper' },
    { key: 'sweetness', label: 'sweetness',  w: wine.sweetness, u: p.sweetness, lo: 'drier',       hi: 'sweeter' },
  ]

  const aligned = []
  const off = []
  for (const a of axisInfo) {
    if (typeof a.w !== 'number' || typeof a.u !== 'number') continue
    const delta = Math.abs(a.w - a.u)
    if (delta <= 12) aligned.push(a)
    else if (delta >= 28) off.push({ ...a, delta, direction: a.w > a.u ? a.hi : a.lo })
  }

  const axes = []
  if (aligned.length) {
    axes.push(`Aligns on ${aligned.slice(0, 2).map(a => a.label).join(' & ')}.`)
  }
  if (off.length) {
    const top = off.sort((a, b) => b.delta - a.delta)[0]
    axes.push(`A touch ${top.direction} on ${top.label} than your usual.`)
  }

  let headline
  if (aligned.length >= 2 && off.length === 0) {
    headline = `A close fit for your ${archetype} palate.`
  } else if (aligned.length >= 1 && off.length <= 1) {
    headline = `Close to your ${archetype} palate, with one tweak.`
  } else if (off.length >= 2) {
    headline = `Different from your ${archetype} palate — try if you're exploring.`
  } else {
    headline = `Compared to your ${archetype} palate.`
  }

  return { headline, axes, archetype }
}
