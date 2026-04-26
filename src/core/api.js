/**
 * Core API — the single contract between UI and business logic.
 *
 * The UI layer (src/ui/**) MUST only import from this file when it needs
 * data, scoring, sorting, or any other domain logic.
 *
 * Today this is backed by local mock data + pure-function engines.
 * Tomorrow these same exports can be swapped for server-function calls
 * (Lovable Cloud, REST, GraphQL, etc.) WITHOUT touching any UI code.
 *
 * Rule of thumb: if it touches data shape, scoring math, or persistence,
 * it belongs behind this file. If it's pixels, layout, copy, or animation,
 * it lives in src/ui/.
 */

import {
  wines,
  tasteProfiles,
  quizSteps,
  wineSearchDb,
  RATING_BUCKETS,
} from './data/mockData.js'
import { sortWines as _sortWines } from './engine/sortEngine.js'
import { computeApproachability as _computeApproachability } from './engine/approachabilityEngine.js'
import {
  inferPalateFromRatings as _inferPalateFromRatings,
  nearestTasteProfile as _nearestTasteProfile,
  groupRatingsByBucket as _groupRatingsByBucket,
} from './engine/palateInferenceEngine.js'
import {
  getInitialNode as _getGuidedInitialNode,
  getNode as _getGuidedNode,
  getNextNode as _getGuidedNextNode,
  computePalateFromGuidedAnswers as _computePalateFromGuidedAnswers,
} from './engine/guidedQuizEngine.js'

// ---------- Data ----------

export function getWines() { return wines }
export function getTasteProfiles() { return tasteProfiles }
export function getQuizSteps() { return quizSteps }
export function getWineSearchIndex() { return wineSearchDb }

/** Five rating buckets used by the wine-rating quiz step. */
export function getRatingBuckets() { return RATING_BUCKETS }

// ---------- Engines ----------

export function sortWines(wineList, mode, tasteProfile = null) {
  return _sortWines(wineList, mode, tasteProfile)
}

export function computeApproachability(wine) {
  return _computeApproachability(wine)
}

/**
 * Infer a palate from { wineId: bucketId } ratings.
 * Returns { palate, confidence, ratedCount, bucketCounts }.
 */
export function inferPalateFromRatings(ratings) {
  return _inferPalateFromRatings(ratings)
}

/** Find the closest archetype for a palate. */
export function nearestTasteProfile(palate) {
  return _nearestTasteProfile(palate)
}

/** Convert { wineId: bucketId } into { bucketId: wineId[] }. */
export function groupRatingsByBucket(ratings) {
  return _groupRatingsByBucket(ratings)
}

// ---------- Guided quiz ----------

export function getGuidedInitialNode() { return _getGuidedInitialNode() }
export function getGuidedNode(id)      { return _getGuidedNode(id) }
export function getGuidedNextNode(id, answer, all) {
  return _getGuidedNextNode(id, answer, all)
}
export function computePalateFromGuidedAnswers(answers) {
  return _computePalateFromGuidedAnswers(answers)
}
