## Goal

Let users narrow scan results by **price, color, varietal, maker, region, and certifications** (natural / biodynamic / organic / low-sulfite). Filters appear on both `PersonalizedResultsScreen` and `AnonResultsScreen`. Match Score remains the default sort; filters stack on top.

## 1. Extend the wine data schema

Three new fields, derived where possible so we don't have to retype every row.

`src/core/data/mockData.js`:
- Add explicit fields to each wine: `color` (`'red' | 'white' | 'rose' | 'sparkling' | 'dessert'`), `maker` (string), `certifications` (`string[]` from: `'natural'`, `'biodynamic'`, `'organic'`, `'low_sulfite'`).
- For speed, add a small helper `inferColorFromGrape(grape)` and apply it in a one-time `wines.map(...)` pass at module load to backfill `color` for any row that doesn't set it explicitly. We'll set certifications/maker explicitly only on wines where it's true / known; everything else gets `[]` and a maker derived from the wine name (text before the grape/varietal token).

This keeps the diff manageable while shipping all four filter facets from day one.

## 2. New filter engine

`src/core/engine/filterEngine.js` (new) exporting:

```text
applyFilters(wines, filters) -> Wine[]
getFilterFacets(wines) -> { colors, varietals, makers, regions, certifications, priceRange:{min,max} }
```

`filters` shape:
```text
{
  priceMin?: number,
  priceMax?: number,
  colors: string[],         // OR within facet
  varietalsInclude: string[],
  varietalsExclude: string[],
  makers: string[],
  regions: string[],
  certifications: string[], // AND across, OR within (any selected match)
}
```

Rules: empty array = no constraint on that facet. Filters AND across facets, OR within. Heroes are filtered too — if a hero pick is filtered out, it drops from the hero rail.

Expose via `src/core/api.js`: `applyFilters`, `getFilterFacets`.

## 3. Filter UI

New `src/ui/components/FilterSheet.jsx` — bottom sheet / inline panel with:
- **Price** range (dual slider, min + max from facets).
- **Color** — pill multi-select.
- **Varietals** — two pill groups: *Include* and *Exclude* (mutually exclusive per varietal).
- **Makers** — searchable pill list (collapses to "+N more" when long).
- **Regions** — pill multi-select.
- **Certifications** — pill multi-select with explanatory subtitle.
- Footer: "Reset" + "Show N wines".

New `src/ui/components/FilterBar.jsx` — compact row above the wine list showing:
- "Filter" button (opens sheet) with badge count of active filters.
- Active filters as removable chips.

Both use existing theme tokens — no new visuals.

## 4. Wire into results screens

In `PersonalizedResultsScreen.jsx` and `AnonResultsScreen.jsx`:
- Add `const [filters, setFilters] = useState(EMPTY_FILTERS)`.
- Apply `applyFilters(scoredWines, filters)` BEFORE hero-pick selection and sort.
- Render `<FilterBar />` between the header banners and the hero picks.
- Update the readout count: "X of Y wines · sorted by Match Score" when filters active.
- Empty-filtered state: friendly message + "Clear filters" button (do not hide the screen).

Match Score sort stays the default for profiled users; the no-strong-matches banner still triggers off the *filtered* set's top score.

## 5. Scan normalizer

`src/routes/api/scan.ts` already returns wine objects from the AI. Update the prompt + normalizer to also emit `color`, `maker`, `certifications` when confidently visible on the bottle/list (otherwise omit). For scan results that don't include these fields, the filter engine treats them as "unknown" and excludes them only when the user explicitly filters that facet (so a missing `certifications` won't be hidden unless the user picks a cert filter).

## 6. Out of scope this pass

- Label image thumbnails (deferred from prior plan, still deferred here).
- Server-side maker/region normalization. We use string-equality with light normalization (trim + casefold) in the filter engine.

## Technical notes

- Color inference fallback table: `Cabernet*, Pinot Noir, Zinfandel*, Sangiovese*, Tempranillo*, Gamay, Merlot, Syrah, Malbec` → red; `Chardonnay, Sauvignon Blanc, Pinot Grigio, Riesling, Viura, Moscato*` → white; anything with "rosé"/"rose" in grape → rose; "Champagne", "Prosecco", "Cava", "Sparkling" → sparkling.
- Maker inference: split wine name on the varietal token; first segment is maker (e.g., "Caymus Cabernet Sauvignon" → "Caymus"). Where this is wrong on iconic wines (e.g., "The Prisoner Red Blend"), set `maker` explicitly.
- Certifications: only set on wines where it's documented in the existing tasting notes (Ridge, Frog's Leap, etc.). Default `[]`.
- All filter state lives in the screen component for now — no URL persistence yet (we can add `validateSearch` later if you want shareable filter URLs).

## Files touched

- new: `src/core/engine/filterEngine.js`
- new: `src/ui/components/FilterSheet.jsx`
- new: `src/ui/components/FilterBar.jsx`
- edited: `src/core/data/mockData.js` (add fields + inference helper)
- edited: `src/core/api.js` (export filter API)
- edited: `src/ui/screens/PersonalizedResultsScreen.jsx`
- edited: `src/ui/screens/AnonResultsScreen.jsx`
- edited: `src/routes/api/scan.ts` (extend AI output schema)
