## Plan — Home reorg, scan-to-rate flow, manual wine entry, scan reliability

### 1. Home screen reorg (signed-in + has-profile)

`src/ui/screens/HomeScreen.jsx`

- Primary CTA copy → **"Scan to find a wine I'll love"** (replaces "Find more wines I'll love"). Button styling unchanged.
- Add a clear visual divider/section break between the primary scan CTA and the taste-profile area: drop the taste-profile card into its own labeled section ("Your taste") below a subtle horizontal rule + extra spacing, so it reads as a separate zone instead of stacking flush.
- "Update my taste profile" link stays under the taste card.
- Recent-scans strip:
  - Heading copy → **"What did you enjoy from your recent scans?"**
  - Each row label → **"Scan from {Weekday} {Month} {Day}"** built from `created_at`. Append the geotag if present: `· {place name}` (`location_label`). Keep existing fallback when neither is set.
  - Right-side affordance changes from "Rate →" to **"Tell us →"**.
  - Add a final **"+ Add a wine I drank"** row at the bottom of the list.

### 2. New flow: rate from a past scan

Tap a scan row → opens a new lightweight "Rate this scan" screen (not the full results screen).

`src/ui/screens/ScanReviewScreen.jsx` (new)

- Header: "Scan from {date} · {place}"
- Optional thumbnail of the scan photo (signed URL via `getPhotoUrl`).
- List of the wines from that scan, each with a 5-bucket rating selector matching the taste-builder buckets (Loved / Liked / Neutral / Not for me / Disliked — reuse the bucket constants from `WineRatingStep`).
- Below the list: **"I picked something not on this list"** — opens the manual wine entry sheet (see §3).
- Below that: **"None of these match what I saw"** — opens the false-positive feedback flow (see §5).
- Save button persists ratings to `wine_ratings` (existing table) using the wine's id/name + a synthetic id for free-text adds. After save → toast + back to home; the taste profile sync hook (`useTasteProfileSync`) picks the new ratings up.

Wiring: `src/UncorkApp.jsx` adds a `scanReview` screen case. `HomeScreen`'s `onOpenScan` is repointed to navigate to `scanReview` instead of replaying the personalized-results screen.

### 3. Manual wine entry ("Add a wine I drank")

`src/ui/components/AddWineSheet.jsx` (new)

- Reuses the existing `WineSearchStep` component (catalog search) as the primary input.
- If no result matches, a **"Add it manually"** button reveals a short form:
  - Wine name (required)
  - Producer / maker (optional)
  - Vintage (optional)
  - Color (optional dropdown — red / white / rosé / sparkling)
- A bucket selector below (5 buckets, same as taste builder).
- Save → inserts a row into `wine_ratings` with a synthetic `wine_id` of `custom:{slug-of-name}` so it doesn't collide with catalog ids. Custom entries are also stashed in a small jsonb on the rating row's metadata for later review (we'll piggy-back on the existing schema by encoding maker/vintage/color into the wine_id slug to avoid a migration; see open question).
- Available from two entry points: the new "+ Add a wine I drank" home row, and the "I picked something not on this list" button on the scan-review screen.

### 4. Scan reliability — loosen + warn + report

`src/routes/api/scan.ts`

- Lower `MIN_WINE_CONFIDENCE` from 35 → 20.
- Lower `MIN_RECOGNITION_RATE` from 0.5 → 0.3 (so partial scans still return results).
- Soften the prompt's grounding language: keep "must be visible" but remove the heavy "missing real wines is just as bad as inventing fake ones" framing, which is producing false negatives. Keep the readability gate, but only force `unreadable` when the model returns zero candidates AND self-reports `unreadable`.
- Always return at least the candidates the model produced when it finds any, even if low confidence — we'll surface a banner rather than block.

`src/ui/screens/PersonalizedResultsScreen.jsx` + `AnonResultsScreen.jsx`

- Add a soft warning banner above results when any wine has confidence < 50: **"We may have missed some, or read a few wrong — let us know if a pick isn't actually on the list."** (Already partially implemented as the low-confidence banner — we'll just retune the threshold and copy.)
- Each wine card gets a small **"Not on the list"** kebab/link affordance.

### 5. False-positive reporting → analytics

New table `scan_feedback` (migration):

```text
id          uuid pk
user_id     uuid (RLS: own rows only)
scan_id     uuid nullable (FK-style ref, no hard FK)
wine_name   text
wine_id     text nullable
reason      text  // 'not_on_list' | 'wrong_details' | 'duplicate'
note        text nullable
created_at  timestamptz default now()
```

RLS: insert own rows, select own rows. (Admin/analytics dashboard will be built later — your future analytics dashboard can query this table directly.)

UI: tapping "Not on the list" on a result card or the "None of these match what I saw" button on the scan-review screen opens a tiny sheet:
- Apology copy: **"Sorry about that — your feedback helps us read labels better."**
- Optional note field.
- Insert into `scan_feedback`, toast confirm, dismiss.

### 6. Date / place formatting helper

`src/ui/utils/formatScan.js` (new) — single function `formatScanLabel(scan)` that produces `"Scan from Wednesday April 29"` and appends `· {place name}` when available. Used by `HomeScreen`, `HistoryScreen`, and `ScanReviewScreen` so the format is consistent.

### Open questions / assumptions

- **Custom wine storage**: I'm encoding manual entries into `wine_ratings` via a `custom:` id rather than adding a `custom_wines` table — this avoids a schema change and keeps personalization working today. If you want richer custom entries (so they show up later in history with full details), we'd add a `custom_wines` table in a follow-up.
- **Rating buckets** assumed identical to the taste-builder's 5 buckets. If you want a simpler thumbs-up/down here instead, say the word.

### Files

Created:
- `src/ui/screens/ScanReviewScreen.jsx`
- `src/ui/components/AddWineSheet.jsx`
- `src/ui/utils/formatScan.js`
- DB migration: `scan_feedback` table + RLS

Edited:
- `src/ui/screens/HomeScreen.jsx`
- `src/ui/screens/HistoryScreen.jsx` (use shared formatter)
- `src/ui/screens/PersonalizedResultsScreen.jsx`
- `src/ui/screens/AnonResultsScreen.jsx`
- `src/UncorkApp.jsx` (new screen + wiring)
- `src/routes/api/scan.ts` (loosen grounding)
