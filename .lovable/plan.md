## Goal

Get your existing **Uncork** wine-discovery prototype (currently in `~/mysom`, a plain Vite + React 18 app) running inside this Lovable project, which is built on **TanStack Start** (SSR, file-based routing, strict TypeScript, deployed to Cloudflare Workers).

Uncork has 9 screens (`Home`, `ScanPrompt`, `Scanning`, `AnonResults`, `QuizIntro`, `Quiz`, `ProfileReveal`, `PersonalizedResults`, `WineDetail`), 16 shared components, a small game engine (`approachabilityEngine`, `matchEngine`, `sortEngine`), mock data, and a custom theme — and uses internal state to switch screens (no router).

## Step 1 — You: clean up local repo, then push

Right now your laptop has two confusing layers:
- `~/LoveableSom/` — a stray "uncork" project (likely an old direct copy of mysom). Not the Lovable repo.
- `~/LoveableSom/LoveableSom/` — **the actual Lovable-connected git repo**. This is where files must go.

You already copied `mysom/src/.` into the real repo, so it now contains `App.jsx`, `main.jsx`, `screens/`, `components/`, `engine/`, `data/`, `theme/`. **Don't push yet** — `main.jsx` will conflict with TanStack's bootstrap. First:

```bash
cd ~/LoveableSom/LoveableSom
rm src/main.jsx          # TanStack uses src/router.tsx instead
rm -rf src/App.jsx       # I'll re-mount this inside src/routes/index.tsx
mv src/App.jsx src/UncorkApp.jsx 2>/dev/null   # (alternative: rename instead of delete)
```

Recommended: **rename** `App.jsx` → `UncorkApp.jsx` (don't delete it — I need its logic):

```bash
cd ~/LoveableSom/LoveableSom
rm src/main.jsx
mv src/App.jsx src/UncorkApp.jsx
git add .
git commit -m "Import Uncork code from mysom"
git push
```

After the push, the files will sync into this Lovable sandbox and I can do the migration work.

## Step 2 — Me: integrate into TanStack Start (after push & you click "Implement plan")

### 2a. Mount the app at `/`
Replace the placeholder `src/routes/index.tsx` with a route that imports and renders `<UncorkApp />`. Add proper SEO `head()` metadata (title: "Uncork — Discover wines you'll love", description, og tags).

### 2b. Make `UncorkApp.jsx` SSR-safe
TanStack runs the route on Cloudflare Workers during SSR. The Uncork app uses only React state — no `window`/`document`/`localStorage` references in the App shell, so it should hydrate cleanly. I'll spot-check the screens and components for any browser-only code (e.g., camera APIs in `ScanningScreen`, `IntersectionObserver`, etc.) and guard them with `useEffect` or `typeof window !== "undefined"`.

### 2c. Wire up styling
Uncork has a `theme/theme.js` (likely a JS object of colors/fonts) and presumably uses inline styles or styled-jsx. Lovable uses **Tailwind v4 via `src/styles.css`**. I'll:
- Keep `theme/theme.js` working as-is (your components reference it directly — no changes needed).
- Make sure `src/styles.css` provides a clean baseline (already does) so Uncork's own styles take over.
- Verify fonts/colors look right in the preview; adjust the body background in `styles.css` if needed.

### 2d. Keep `.jsx` files as-is
The project is strict TS, but `.jsx` files are allowed. I won't convert all 25+ files to TypeScript in this pass — that would be a separate, larger effort. They'll work as JavaScript modules.

### 2e. Verify dependencies
`mysom`'s `package.json` only needs `react` and `react-dom`, both already present. **No new deps required** unless a screen secretly imports something (I'll verify by scanning imports across all 25 files once they land).

### 2f. Sanity check & cleanup
- Confirm dev server boots, all 9 screens are reachable through the in-app navigation.
- Confirm no console errors on hydration.
- Leave router/scroll restoration alone (not needed — Uncork manages its own screen state).
- Don't touch `src/router.tsx`, `src/routes/__root.tsx`, `src/routeTree.gen.ts`.

## What this plan does NOT do

- **No TypeScript conversion** of Uncork's JSX files (can be a future pass).
- **No splitting screens into separate routes** — Uncork is designed as a single in-app flow with custom transitions (`ScreenTransition.jsx`); routing each screen would break the animation system. It correctly lives at one URL (`/`).
- **No backend changes** — Uncork uses mock data only; nothing needs Lovable Cloud yet.
- **No design changes** — your existing theme and components render as-is.

## After this plan

Once Uncork is running on Lovable, natural follow-ups (separate requests):
- Replace mock wines with real data (Lovable Cloud + a `wines` table).
- Add real wine-label scanning via an AI vision model (Lovable AI Gateway).
- Persist taste profiles per user (auth + Lovable Cloud).
- Convert `.jsx` → `.tsx` for type safety.

## Your move

1. Run the cleanup + push commands in Step 1.
2. Tell me once the push is complete (or if `git push` errors out — auth issues are common).
3. Click **Implement plan** to switch me to default mode so I can do Step 2.