## Goal

Rebrand the MySom app around **Forge's flame mark and color palette**, replacing the forest-green & brass "Velvet & Brass" theme with **"Ember & Tide"** — Forge navy + ember orange/red + tide blue. Implement concept #2 (flame swirl in wine glass) as a hand-crafted SVG monogram in the brand colors.

The Forge logo (extracted from your PPTX) is itself a flame — orange/red/blue intertwined ribbons rising upward. The wine app's mark will echo that flame, but contained inside an elegant wine glass: visually a clear sibling to the Forge brand.

## What changes

### 1. New theme palette — `src/ui/theme/theme.js`
Replace forest/brass tokens with Forge tokens (typography stays Cormorant Garamond + Inter):

| Token | Old (Velvet & Brass) | New (Ember & Tide) |
|---|---|---|
| `brand` | `#1F3A2E` forest | `#162969` Forge navy |
| `brandDark` | `#0F1F18` | `#0B142E` deep navy |
| `brandDeep` | `#16271F` | `#1B2E73` mid navy |
| `gold` | `#B08D3E` brass | `#FF5F0E` ember orange |
| `goldBright` | `#D4AF6A` polished brass | `#FF8048` bright ember |
| `crimson` (new) | — | `#B61E23` flame tip |
| `tide` (new) | — | `#5EAAE6` mid blue |
| `tideLight` (new) | — | `#81C3E4` pale tide |
| `tideDeep` (new) | — | `#2250B7` royal blue |
| Match/badge colors | sepia/aubergine | navy/orange/green |

The existing `gold` / `goldBright` keys are **kept as aliases** for ember so all 30+ files that reference them keep working without edits.

### 2. New monogram — replace inline SVG in `HomeScreen.jsx`
Build the new mark as a hand-drawn SVG inline component:
- **Wine glass silhouette**: thin navy (`#162969`) outline, ~1.4px stroke
- **Flame swirl rising from the bowl**: three intertwined ribbon strokes echoing Forge's logo
  - Outer ribbon: ember orange (`#FF5F0E`)
  - Inner curl tip: crimson (`#B61E23`)
  - Single tide-blue (`#5EAAE6`) ribbon at the base for contrast/motion
- Containing brass ring → **navy ring** with subtle orange glow
- Sized 88×88 in the home hero (same as today)

### 3. New favicon + og-image
Generate from the new SVG monogram (no AI image gen needed — render the SVG to PNG at multiple sizes via a small node script):
- `public/favicon.png` (256×256) — monogram on transparent background
- `public/og-image.jpg` (1200×630) — monogram + "MySom" wordmark + "Uncork the world of wine" tagline on Forge navy gradient

### 4. Update Velvet & Brass references
- Update `mem://index.md` Core memory: aesthetic name → "Ember & Tide", swap color hexes, drop the brass-divider language (or rename to "ember divider").
- The thin gold dividers, brass-ringed icon chips, gradient brass buttons all keep the same shapes — they just become ember-orange instead of brass-gold (no per-file edits needed because they all reference `theme.colors.gold` / `goldBright`).

### 5. Tagline kept
"Uncork the world of wine" stays. "Est. Cellar" already removed.

## What does NOT change

- Typography (Cormorant Garamond italic display + Inter UI)
- Layout / component structure / radii / shadows
- All other screens (they auto-recolor via theme tokens)
- Auth, routing, backend
- Per-file imports — `theme.colors.gold` keeps working as an alias for ember

## Files touched

- `src/ui/theme/theme.js` — new palette
- `src/ui/screens/HomeScreen.jsx` — new SVG monogram (replaces current wine-glass-line monogram)
- `public/favicon.png` — regenerated
- `public/og-image.jpg` — regenerated
- `mem://index.md` — updated brand memory (aesthetic name, hexes)
- (one helper script in `/tmp/` to render favicon/og from SVG; not committed)

## Out of scope

- Wholesale visual redesign of other screens (they'll just look different colors)
- Wordmark / logotype refinement (still Cormorant italic "MySom")
- Co-branded "Powered by Forge" mark (can do later if you want)
