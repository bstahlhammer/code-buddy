## Goal

Convert the Home screen into a **login wall**. Until the user is signed in, they see only the brand and two sign-in buttons. All features (scan, quiz, results, wine details, account) require auth.

## UX Changes

### 1. New unauthenticated Home (login wall)
When `auth.user` is null, `HomeScreen` renders:
- Top half: existing monogram + "Est. Cellar / MySom / Uncork the world of wine" lockup (kept centered, pushed slightly up).
- Bottom-center: stacked CTAs
  1. **Continue with Google** — cream button with Google "G" logo (reuse SVG from `AuthScreen`)
  2. **Sign in with email** — outlined brass button → navigates to `auth` screen (email mode, Google button hidden)
- Below buttons: tiny links to `/privacy` and `/terms` + 21+ disclaimer (moved from AuthScreen footer).
- Remove the top-right "Sign in" chip when logged out (the whole screen is now the sign-in surface).

### 2. Authenticated Home (unchanged shell, features visible)
When `auth.user` exists, `HomeScreen` keeps the current layout: account chip top-right, "Choose a wine now", "Build my taste profile", "just let me explore" CTAs.

### 3. Auth screen (`AuthScreen.jsx`)
- Accept a new `mode` prop (`'email' | 'full'`, default `'full'`).
- When `mode === 'email'` (entered from "Sign in with email" on Home), hide the Google button + "or" divider — just the email/password form with a small "Continue with Google instead" link that calls `signInWithGoogle()`.
- Footer legal links + 21+ disclaimer stay (still useful here).

### 4. Routing gate in `UncorkApp.jsx`
Replace the current narrow gate (only `personalizedResults` requires auth) with a global gate:
- Allowed screens when logged out: `home`, `auth`, `privacy`-style routes are TanStack routes (separate, unaffected).
- Any `navigate(to)` call where `to !== 'home' && to !== 'auth'` and `!auth.user` → redirect to `auth` screen and store `pendingAfterAuth = to`.
- After successful sign-in, `handleAuthed` resumes to `pendingAfterAuth` (already implemented; just broaden which screens set it).
- On sign-out (from `/account`), user lands back on `/` → Home renders the login wall automatically.

### 5. Home CTA wiring
- "Continue with Google" → call `auth.signInWithGoogle()` directly from Home (import `useAuth` or pass handler from App). On error, show inline message under the buttons. On redirect, browser leaves page.
- "Sign in with email" → `navigate('auth')` with mode flag. Simplest: add new screen key `'authEmail'` OR pass a transient `authMode` state in App. Use App-level `authMode` state, default `'full'`, set to `'email'` before navigating, reset to `'full'` on auth success/back.

## Technical Details

**Files to edit**
- `src/ui/screens/HomeScreen.jsx` — branch on `auth.user`; add login-wall layout with bottom-anchored CTAs (Google SVG + email button), legal footer, error state.
- `src/ui/screens/AuthScreen.jsx` — accept `mode` prop; conditionally render Google button + divider; keep email form as default content.
- `src/UncorkApp.jsx`:
  - Add `authMode` state (`'full' | 'email'`).
  - Broaden `navigate` gate: if `!auth.user && to !== 'home' && to !== 'auth'`, push `auth` and set `pendingAfterAuth = to`.
  - Pass `authMode` + `setAuthMode` to `HomeScreen` and `AuthScreen`.
  - Pass `auth.signInWithGoogle` (and any error surface helper) to `HomeScreen`.

**No backend / route / migration changes.** TanStack routes (`/account`, `/privacy`, `/terms`) untouched.

**Layout note**: bottom-center CTAs use the existing flex `space-between` on the Home container — simply replace the lower CTA cluster with the new two-button version when logged out.

## Out of scope
- Forgot-password flow.
- Email verification UX changes.
- Reorganizing `/account` page.
