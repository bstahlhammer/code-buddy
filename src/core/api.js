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

import { wines, tasteProfiles, quizSteps, wineSearchDb } from './data/mockData.js'
import { sortWines as _sortWines } from './engine/sortEngine.js'
import { computeApproachability as _computeApproachability } from './engine/approachabilityEngine.js'

// ---------- Data ----------

/** Return the catalog of wines available for results screens. */
export function getWines() {
  return wines
}

/** Return the list of available taste profile archetypes. */
export function getTasteProfiles() {
  return tasteProfiles
}

/** Return the ordered list of quiz steps used by the onboarding flow. */
export function getQuizSteps() {
  return quizSteps
}

/** Return the local wine search index used by the quiz "wine search" step. */
export function getWineSearchIndex() {
  return wineSearchDb
}

// ---------- Engines ----------

/**
 * Sort a list of wines using one of the supported sort modes.
 * @param {Array} wineList
 * @param {string} mode  e.g. 'match' | 'price' | 'rating' | 'approachability'
 */
export function sortWines(wineList, mode) {
  return _sortWines(wineList, mode)
}

/**
 * Compute the 1–5 approachability score for a wine.
 * @param {object} wine
 */
export function computeApproachability(wine) {
  return _computeApproachability(wine)
}
