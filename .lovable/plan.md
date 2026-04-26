## Goal

Give users two clear ways to build a palate profile:

1. **"Rate wines I know"** — the existing search/rate flow (loved → hated buckets), great for users who can name bottles.
2. **"Guide me with questions"** — a NEW branching, sommelier-style quiz that progressively asks about taste, flavor, body, and (optionally) advanced structure. Designed for users who don't know wine names.

Both paths land at the same `profileReveal` screen, using the same palate shape `{ body, sweetness, tannin, acidity }` so all downstream sorting/matching logic is unchanged.

---

## UX flow

### 1. Rework `QuizIntroScreen` into a path chooser

Replace the single "Start the quiz" CTA with two clear cards:

- **🍷 Rate bottles I know** → navigates to a new `wineRatingsOnly` screen (or the existing quiz jumped to the `wineRatings` step).
- **🧭 Guide me with questions** → navigates to the new `guidedQuiz` screen.
- Keep "Skip for now" as a tertiary link.

### 2. New screen: `GuidedQuizScreen`

A branching, level-based quiz separate from the existing free-form `QuizScreen`. Driven by a declarative tree in core data.

**Branching rules (from your spec):**

- **Level 1 — Entry:** "What kind of wine do you usually enjoy?" → Light & crisp / Smooth & fruity / Rich & bold / Not sure yet.
  - "Not sure yet" → routes to **Flavor path first** (Level 3).
  - Any other answer → routes to **Simple taste path** (Level 2).

- **Level 2 — Simple taste:** sweetness → acidity → tannin (with a "I mainly drink white" escape hatch on the tannin question).

- **Level 3 — Flavor path:** flavor families (multi-select) → fruity vs. savory.

- **Level 4 — Body & structure:** body → alcohol warmth.

- **Level 5 — Advanced (optional, gated):** Only shown if the user has given mostly confident answers (no "Not sure" on Level 2 OR completed Level 3 with ≥3 flavor picks). Asks the sommelier-style structure question + finish preference. Otherwise skipped.

Every question includes a "Not sure" option that contributes neutral signal.

### 3. Both paths converge

After either path finishes (rating wines OR guided quiz), `deriveProfile()` blends signals into the same palate and routes to `profileReveal` → `personalizedResults`.

---

## Engine work (`src/core/`)

### a. New file: `src/core/data/guidedQuizTree.js`

Declarative tree of questions. Each node:
```js
{
  id: 'entry',
  level: 1,
  question: '...',
  subtitle: '...',
  type: 'single' | 'multi',
  options: [
    { id: 'light_crisp', label: 'Light and crisp', palate: { body: -25, acidity: +20 }, next: 'sweetness' },
    { id: 'not_sure',    label: 'Not sure yet',    palate: {},                         next: 'flavors' },
    ...
  ],
}
```

- Each option carries a small **palate delta** (signed nudges to body/sweetness/tannin/acidity, in the same 0–100 space already used).
- `next` is either a node id, a function `(answers) => nextId`, or `null` for terminal.
- "Not sure" options always have empty/zero palate deltas so they don't pollute signal.

Level mapping (deltas are illustrative — final values tuned in implementation):

| Question | Option | Delta |
|---|---|---|
| Entry | Light & crisp | body -25, acidity +20 |
| Entry | Smooth & fruity | body 0, sweetness +10, tannin -15 |
| Entry | Rich & bold | body +25, tannin +15 |
| Sweetness | Dry / Slightly sweet / Sweet | sweetness -25 / +10 / +35 |
| Acidity | Crisp / Soft / Both | acidity +20 / -15 / 0 |
| Tannin | Yes grip / A little / Smooth / White only | tannin +25 / +5 / -20 / 0 |
| Flavors (multi) | each pick contributes a small targeted delta (e.g. citrus → acidity +10, dark fruit → body +10 tannin +10, oaky → body +10) |
| Fruity vs. savory | (flavor character flag, no direct palate axis) |
| Body | Light/Med/Full | body -25 / 0 / +25 |
| Alcohol warmth | Low/Some/Rich | body -10 / 0 / +15 |
| Advanced structure | maps directly to all 4 axes (closer to centroid pull) |
| Finish | minor body/tannin nudges |

### b. New file: `src/core/engine/guidedQuizEngine.js`

Pure functions:
- `getInitialNode()` → `'entry'`
- `getNextNode(currentId, answer, allAnswers)` → next node id or `null`
- `computePalateFromGuidedAnswers(answers)` → `{ palate, confidence }`
  - Starts from neutral baseline `{ body: 50, sweetness: 30, tannin: 50, acidity: 50 }`.
  - Sums all option deltas, clamps each axis to 0–100.
  - Confidence = (# non-"not sure" answers) / (# answered), with a floor so 1 strong answer still yields a usable profile.

### c. Update `src/core/api.js`

Add exports:
- `getGuidedQuizTree()`
- `getGuidedInitialNode()`, `getGuidedNextNode(id, answer, all)`
- `computePalateFromGuidedAnswers(answers)`

### d. Update `src/UncorkApp.jsx` — `deriveProfile`

Extend to blend three signal sources by confidence:
1. Wine ratings (existing `inferPalateFromRatings`)
2. Guided quiz (`computePalateFromGuidedAnswers`)
3. Slider/sweetness fallback (existing)

Weighted average by each source's confidence, then `nearestTasteProfile` for archetype.

---

## UI work (`src/ui/`)

### New files

- `src/ui/screens/GuidedQuizScreen.jsx` — driver for the branching tree. Uses existing `TopBar` + `ProgressBar` (progress = answered/estimatedTotal where estimatedTotal is computed from current branch).
- `src/ui/components/QuizOptionCard.jsx` — large tappable answer cards (more elegant than current pill chips, fits Velvet & Brass aesthetic: parchment surface, brass border on selected, serif label + sans subtitle).

### Edited files

- `src/ui/screens/QuizIntroScreen.jsx` — replace single CTA with two path-chooser cards + tertiary "Skip" link. Keep existing illustration and trust bullets, restructured.
- `src/UncorkApp.jsx` — add `guidedQuiz` screen case + state for `guidedAnswers`, route guidedQuiz completion through `deriveProfile` → `profileReveal`.

### Unchanged

- The existing `QuizScreen` (free-form quiz with pills/sliders/wine ratings) stays intact — accessible from "Rate bottles I know" or as an internal route. We are NOT deleting prior work.
- `WineRatingStep`, `WineSearchStep`, all results screens, match engine, sort engine, theme — untouched.

---

## Open items handled silently in implementation
- Exact palate-delta numbers: I'll tune them so Level-1 alone produces a sensible directional profile, with subsequent answers refining it.
- Branch logic for "I mainly drink white wine" on the tannin question: skip to flavors and zero out tannin signal.
- Advanced level gating threshold.

---

## Out of scope (for this turn)
- Showing a live palate preview during the guided quiz (could add later — same component as `WineRatingStep` preview).
- Persistence of answers across sessions.
- Real wine API integration.
