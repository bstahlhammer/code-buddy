# Som — AI Wine Buying Copilot

## What this app does
Scan a restaurant wine list, bottle label, or store shelf and get personalized wine recommendations based on the user's taste profile, budget, group, and value. The core value proposition: **honest, confident picks** — if nothing on the list meets the user's palate and quality bar, say so clearly.

## Tech stack
- **Framework**: React + TanStack Router (file-based routes), Vite, TypeScript/JSX
- **Hosted on**: Lovable (Cloudflare Workers serverless; `wrangler.jsonc` config)
- **Database**: Supabase (`rlgsftutrzwnxbzmzgcx.supabase.co`) — RLS on user tables; `wine_catalog` is public read-only
- **Vision AI**: Gemini 2.5 Pro via `ai.gateway.lovable.dev` (proxied through Lovable's AI gateway)
- **Package manager**: Bun (use `bun install`, `bun run dev`, etc.)

## Key architectural rules
1. **UI imports from `src/core/api.js` only** — never import engines or data directly in UI components.
2. `src/core/data/mockData.js` is the local data layer. The real data layer (Supabase) is used at scan time and for user profiles.
3. Server functions live in `src/routes/api/*.ts` (TanStack Router server handlers).

## Critical files to know

### Scoring & recommendations
| File | Purpose |
|------|---------|
| `src/core/engine/matchEngine.js` | `computeMatch()` — 0-100 taste fit score. `getConfidenceLevel()` — two-signal gate (taste + quality). `explainMatch/Mismatch()` |
| `src/core/engine/heroPicksEngine.js` | `chooseHeroPicks()` — selects Top Pick / Best Value / Crowd Pleaser |
| `src/core/api.js` | **Single barrel export** for all engines. UI only imports from here. |

### Scan pipeline
| File | Purpose |
|------|---------|
| `src/routes/api/scan.ts` | POST handler: Gemini vision → wine list → catalog enrichment → response |
| `src/core/wineCatalog.ts` | `lookupWine()`, `enrichScannedWines()`, `qualityTier()`, `qualityLabel()` |

### Data
| File | Purpose |
|------|---------|
| `src/core/data/mockData.js` | ~50 catalog wines (rated 85-99), ~100 palate-only wines for taste calibration |
| `supabase/migrations/20260528000001_wine_catalog.sql` | `wine_catalog` table + `lookup_wine()` RPC (pg_trgm fuzzy match) |
| `scripts/import_wine_catalog.py` | Imports Kaggle Wine Enthusiast (130k) + HuggingFace WineSensed (824k) |

### UI screens
| File | Purpose |
|------|---------|
| `src/ui/screens/PersonalizedResultsScreen.jsx` | Main results screen after scan. Shows hero picks + full list |
| `src/ui/screens/WineDetailScreen.jsx` | Individual wine deep-dive |
| `src/ui/screens/ProfileScreen.jsx` | User taste profile settings |

## Two-signal quality system (recently built)

### The problem we solved
`computeMatch()` was returning "2 strong fits" for budget/low-quality wines (Apothic, Motif) because it only measured palate axis proximity — quality was ignored entirely.

### How it works now
Every scanned wine carries two scores:
- **`tasteFit`** — `computeMatch()` result (0-100, palate axes: body 2×, tannin 2×, sweetness 1×, acidity 1×)
- **`qualityScore`** — honest 0-100 from `wine_catalog` (see mapping below); defaults to 50 if not in catalog

`getConfidenceLevel(tasteFit, qualityScore, tasteFitThreshold=82, qualityThreshold=85)` returns:
- `'confident'` — both signals ≥ threshold → "We'd confidently order this for you"
- `'closest'` — one signal ok, or both close but below → "Closest Available" pill
- `'stretch'` — weak on both → last-resort framing

**"Honest take." banner** fires when no wine on the scanned list earns `'confident'`:
> *"None of these wines match your palate or quality standards. We wouldn't confidently order any of these for you."*

Quality and taste-fit thresholds are user-adjustable profile settings (defaults: 82/85).

### Honest quality scale (not the raw Wine Enthusiast 80-100 band)
The raw WE scale compresses everything into 80-100 (80 = passing, 100 = perfect). We remap to an honest 0-100:

| Critic score | Quality score | What it means |
|---|---|---|
| 80 | ~23 | Poor |
| 85 | ~48 | Decent, not a standout |
| 90 | ~74 | Good |
| 92 | ~84 | Very good |
| 95 | ~94 | Outstanding |
| 99 | ~99 | Extraordinary |

Vivino (0-5 scale): 4.0→75, 4.2→84, 4.4→91, 4.7→97

Display labels: ≥94 "Extraordinary", ≥88 "Outstanding", ≥84 "Highly rated", ≥74 "Solid everyday wine", ≥60 "Decent, not a standout", ≥45 "Below average", else "Poor quality"

## Wine catalog (Supabase)

### Current state
⚠️ **The `wine_catalog` table is empty** — the migration (`20260528000001_wine_catalog.sql`) has been written but **not yet applied**, and the import script has not been run. Every wine currently falls back to `qualityScore: 50`.

### To seed the catalog (run locally)
```bash
# 1. Apply the migration (if not done via Lovable dashboard)
supabase db push  # or apply via Supabase dashboard SQL editor

# 2. Get a Kaggle dataset
#    Download from: https://www.kaggle.com/datasets/zynicide/wine-reviews
#    File needed: winemag-data-130k-v2.csv

# 3. Install deps
pip install pandas requests datasets kaggle --break-system-packages

# 4. Set your Supabase SERVICE key (NOT the anon/publishable key — needs write access)
export SUPABASE_URL="https://rlgsftutrzwnxbzmzgcx.supabase.co"
export SUPABASE_SERVICE_KEY="<your service role key from Supabase dashboard>"

# 5. Run the import
cd scripts/
python import_wine_catalog.py --source both --kaggle-csv /path/to/winemag-data-130k-v2.csv

# Dry run first to preview:
python import_wine_catalog.py --source both --kaggle-csv /path/to/winemag-data-130k-v2.csv --dry-run
```

The service key is in: Supabase dashboard → Project Settings → API → `service_role` key.

## Environment variables
`.env` already has:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (anon key — safe for client)
- `VITE_SUPABASE_*` variants for client-side

The import script needs `SUPABASE_SERVICE_KEY` (write-access) set separately in your shell — don't put it in `.env`.

## Pending work / next priorities
1. **Apply `wine_catalog` migration** to Supabase (SQL in `supabase/migrations/20260528000001_wine_catalog.sql`)
2. **Run `scripts/import_wine_catalog.py`** to seed ~130k+ wines
3. **Two-signal card UI** — `WineCard.jsx` and `HeroPickCard.jsx` need separate "Taste fit" + "Wine quality" bars (green/amber/red by tier), plus "Closest Available" pill
4. **Quality threshold slider** in `ProfileScreen.jsx` — user-adjustable `qualityThreshold` (default 85) stored in taste profile
5. **`WineDetailScreen.jsx`** — surface `qualityLabel()` and `catalogMatch` metadata (region, grape, critic score)

## Supabase project
- URL: `https://rlgsftutrzwnxbzmzgcx.supabase.co`
- `lookup_wine(p_name, p_vintage, p_threshold)` — pg_trgm fuzzy match RPC, returns up to 3 candidates
- `wine_catalog` — public, no RLS, read-only reference table
