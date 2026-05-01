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
import { chooseHeroPicks as _chooseHeroPicks } from './engine/heroPicksEngine.js'
import { computeApproachability as _computeApproachability } from './engine/approachabilityEngine.js'
import { computeMatch as _computeMatch, explainMatch as _explainMatch, explainMismatch as _explainMismatch } from './engine/matchEngine.js'
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
import { describePalate as _describePalate } from './ai/describePalate.functions'
import {
  applyFilters as _applyFilters,
  getFilterFacets as _getFilterFacets,
  countActiveFilters as _countActiveFilters,
  EMPTY_FILTERS,
  CERTIFICATION_LABELS,
  COLOR_LABELS,
} from './engine/filterEngine.js'
import {
  placesAutocomplete as _placesAutocomplete,
  placesGetDetails as _placesGetDetails,
  placesNearby as _placesNearby,
} from './places/places.functions'
import { supabase } from '@/integrations/supabase/client'

async function authHeaders() {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

/**
 * Ask the AI to translate a free-text wine description into palate axes
 * + a short coaching note. Returns { palate, confidence, coachingNote, vocabulary }.
 */
export async function describePalateFromText(description) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) {
    return {
      palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
      confidence: 0,
      coachingNote: 'Please sign in to use the AI palate coach.',
      vocabulary: [],
      error: 'auth_required',
    }
  }
  return _describePalate({
    data: { description },
    headers: { Authorization: `Bearer ${token}` },
  })
}

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

/** Choose 3 hero picks (Top Pick / Best Value / Crowd Pleaser) from a wine list. */
export function chooseHeroPicks(wineList, tasteProfile = null) {
  return _chooseHeroPicks(wineList, tasteProfile)
}

export function computeApproachability(wine) {
  return _computeApproachability(wine)
}

/** Compute 0–100 match score for a wine vs a taste profile. */
export function computeMatch(wine, tasteProfile) {
  return _computeMatch(wine, tasteProfile)
}

/** Plain-language explanation of why a wine got its match score. */
export function explainMatch(wine, tasteProfile) {
  return _explainMatch(wine, tasteProfile)
}

/** Honest take on where a wine diverges from the user's palate. */
export function explainMismatch(wine, tasteProfile) {
  return _explainMismatch(wine, tasteProfile)
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

// ---------- Google Places (location matching for scan history) ----------

export async function searchPlaces({ query, lat, lng, sessionToken }) {
  const headers = await authHeaders()
  if (!headers) return { suggestions: [], error: 'auth_required' }
  return _placesAutocomplete({ data: { query, lat, lng, sessionToken }, headers })
}

export async function getPlaceDetails({ placeId, sessionToken }) {
  const headers = await authHeaders()
  if (!headers) return { place: null, error: 'auth_required' }
  return _placesGetDetails({ data: { placeId, sessionToken }, headers })
}

export async function findNearbyPlaces({ lat, lng, radius }) {
  const headers = await authHeaders()
  if (!headers) return { places: [], error: 'auth_required' }
  return _placesNearby({ data: { lat, lng, radius }, headers })
}

// ---------- Shelf bottle locator ----------

/**
 * Lazy backfill: given a saved scan + wine name, ask the server to find
 * the bottle in the photo and return a normalized bbox.
 * Returns { found: bool, bbox?: { x, y, w, h }, error?: string }
 */
export async function locateBottleInScan({ scanId, wineName }) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData?.session?.access_token
  if (!token) return { found: false, error: 'auth_required' }
  try {
    const res = await fetch('/api/scan/locate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ scanId, wineName }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { found: false, error: text || `http_${res.status}` }
    }
    return await res.json()
  } catch (e) {
    return { found: false, error: e?.message || 'unknown' }
  }
}

// ---------- Filters ----------

export function applyFilters(wineList, filters) { return _applyFilters(wineList, filters) }
export function getFilterFacets(wineList)       { return _getFilterFacets(wineList) }
export function countActiveFilters(filters)     { return _countActiveFilters(filters) }
export { EMPTY_FILTERS, CERTIFICATION_LABELS, COLOR_LABELS }
