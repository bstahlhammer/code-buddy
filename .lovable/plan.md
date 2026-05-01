## Wine Flight — Onboarding, Profile & Results Polish

A consolidated plan covering copy fixes, the taste-builder scroll bug, smarter scan results, label thumbnails, filtering, and a group/gift intent prompt.

---

### 1. Copy & CTA cleanup (small, fast)

- **HomeScreen** (`src/ui/screens/HomeScreen.jsx`): when `hasProfile` is true, no CTA should imply "build". The primary CTA stays "Find more wines I'll love"; the TasteProfileCard is the way to update. Add a small "Update my taste profile" link below the card for users who want to refine.
- **Em-dash sweep**: replace every `—` and `–` with either a colon, comma, or period across user-facing strings. Files in scope (UI copy only — not engine math comments):
  - `src/ui/screens/HomeScreen.jsx`, `ScanningScreen.jsx`, `ScanPromptScreen.jsx`, `AnonResultsScreen.jsx`, `PersonalizedResultsScreen.jsx`, `TasteBuilderScreen.jsx`, `WineDetailScreen.jsx`, `ProfileScreen.jsx`, `ProfileRevealScreen.jsx`, `HistoryScreen.jsx`, `RateBottlesScreen.jsx`, `GuidedQuizScreen.jsx`, `QuizScreen.jsx`, `AuthScreen.jsx`
  - `src/ui/components/HeroPickCard.jsx`, `WineCard.jsx`, `UpsellBanner.jsx`, `MatchScore.jsx`, `WineRatingStep.jsx`, `WineSearchStep.jsx`
  - `src/routes/privacy.tsx`, `terms.tsx`, `index.tsx`, `account.tsx`
  - `src/core/data/wineFacts.js` and any `tasting`/`reasoning` strings produced in engines (keep punctuation natural — replace with comma/period, not just deletion).

### 2. Fix the Taste Builder scroll bug

`TasteBuilderScreen.jsx` wraps content in a flex column with `min-height: 0` but the inner scroll container shares that flex context with a header AND a fixed footer. On short viewports the inner `overflow-y: auto` div can lock at zero scroll height. Fix:
- Give the scroll container an explicit `flex: 1 1 0`, `minHeight: 0`, and ensure its parent chain (`<DeviceFrame>` content / route shell) does not double-constrain height.
- When a Section is open, scroll it into view so users can see the just-revealed content.

### 3. Empty profile preview — replace "The Bold Red Lover"

The `ProfilePreview` placeholder currently shows a hint string but the source of "The Bold Red Lover" is the empty state of TasteProfileCard / archetype fallback rendering on results screens.
- TasteBuilder empty preview: change to a friendlier prompt: "Pick a starting archetype or rate one bottle to see your profile take shape." No archetype name shown.
- HomeScreen TasteProfileCard: render only when `tasteProfile` truly exists (already does), and never substitute a default archetype name when ratings are zero.
- Audit `nearestTasteProfile` callers to ensure we never render an archetype label when the underlying palate has no signal.

### 4. Scanning experience — group/gift intent

On `ScanningScreen.jsx`, after the user selects "A group" or "A gift", reveal a second question: "What are you looking for?" with these options:
- Crowd pleaser
- Something unique and interesting
- A splurge
- Something from a specific maker (free-text input)
- Something from a specific region (free-text input)
- A specific varietal or blend (free-text input)

Multi-select up to 2. Store as `scanIntent: { mode: 'group'|'gift', tags: string[], maker?: string, region?: string, varietal?: string }` on the app state (`UncorkApp.jsx`). Pass it through to results so it can preselect filters/sort.

Allow the user to keep typing while the scan runs (fields remain interactive). Advance to results only when scan is done AND buyingFor is chosen (intent tags optional).

### 5. Results screen — readout, warnings, match-first sorting

In `AnonResultsScreen.jsx` and `PersonalizedResultsScreen.jsx`:

- **Readout line** under the title: "X wines identified · Y readable · sorted by Match Score". Pull `wines.length` and a count of `confidence >= 70`.
- **Low-confidence warning**: if `wines.filter(w => w.confidence < 60).length / wines.length >= 0.3`, show a soft amber chip: "Some labels were hard to read — try a sharper photo for a complete shortlist."
- **Match Score is the default sort** for any user with a profile (overrides previous group/approachability default per your decision). Buying-for becomes a *filter intent*, not a sort.
- **Match Score column treatment**: every WineCard/HeroPickCard already shows a score chip when a profile exists. Make it more prominent on the list rows (right-aligned, /100 wording on first card: "92/100"), and show the existing tooltip on tap.
- **Drill-in**: tap the Match Score chip to open a small explanation sheet using `explainMatch()` — already implemented in `MatchScore.jsx` tooltip; promote it to a full bottom sheet on small screens with the headline + axis breakdown + a "How is this calculated?" footer link explaining the body/tannin/sweetness/acidity weighting and rating bonuses.
- **No-strong-matches banner**: if `max(matchScore) < 80`, render a soft banner above hero picks: "No strong matches on this list — here are the closest from what we found." Hero picks still render.

### 6. Label thumbnails (web-sourced, not the photo)

- Add an optional `labelImageUrl` to wine objects. For mock data, hand-pick public bottle-shot URLs (or use a free CDN like Unsplash placeholders) per wine in `mockData.js`.
- For scan-derived wines, add a server lookup step in the scan pipeline: given `name + vintage + region`, query a label-image source (Wikipedia/Wikidata `P18` or a simple Google Image Search proxy via an edge function) and cache the URL on the result. If lookup fails, fall back to a generic SVG bottle silhouette tinted by wine color.
- Render the thumbnail at 56×72 to the left of the wine name in `WineCard.jsx` and `HeroPickCard.jsx`.

### 7. Filters

Schema additions (in `src/core/data/mockData.js` and the scan response normalizer):
- `color`: `red | white | rose | sparkling | dessert` (derived from grape + name where missing).
- `maker`: producer/winery name (parse from `name` for mock data; ask the model in the scan prompt).
- `certifications`: `string[]` from `natural | biodynamic | organic | low_sulfite`.
- `priceNum`: already present.

UI: a `<Filters />` component above the full list (collapsible), with chips/sliders:
- Price range slider (min/max from current results).
- Color toggle group (multi-select).
- Varietal multi-select (built from current results' grapes).
- Maker multi-select (built from current results' makers).
- Certifications multi-select.

Filters apply on top of the current sort. If `scanIntent` is set, prefill: "specific maker" → maker filter, "specific region" → region filter (new chip, derived from results), "specific varietal" → varietal filter, "splurge" → price-desc within top 25%, "unique" → exclude `isCrowd`, "crowd pleaser" → require `isCrowd`.

### 8. Implementation order

1. Copy + em-dash sweep + HomeScreen "update my taste profile" CTA.
2. Empty-state copy fix in TasteBuilder & ProfilePreview.
3. Taste-builder scroll fix.
4. Scanning screen: add intent question with conditional follow-ups.
5. Results: readout line, low-confidence warning, match-first sort, drill-in sheet, no-strong-matches banner.
6. Wine schema additions in mockData + scan normalizer + filter UI.
7. Label thumbnail: schema + mock URLs + render. (Server lookup for live scans is a follow-up if the simple proxy is too much for this pass — confirm before that step.)

### Technical notes

- All copy edits respect the architecture rule: UI files only.
- Filter logic and `scanIntent` interpretation belong behind `@/core/api` (new `applyFilters(wines, filterState)` and `intentToFilters(intent)` helpers in a new `src/core/engine/filterEngine.js`).
- Match-Score drill-in reuses `explainMatch()`; no engine changes required for the calculation.
- Label thumbnail server lookup, if implemented now, should be a new TanStack server route under `src/routes/api/label-image.ts` returning `{ url }` with caching headers; otherwise defer.

Open items to confirm before/after kickoff:
- OK to defer the server-side label image lookup and ship mock URLs only in this pass? (Faster, less risk.)
- For "specific maker / region / varietal" intent inputs: free-text now, or constrained dropdown built from the catalogue?
