/**
 * MySom design-system theme bridge.
 *
 * This file keeps the SAME object shape your existing components already
 * import (theme.colors.brand, theme.spacing.lg, etc.), but every value
 * now points at a CSS variable defined in `tokens.css`. Result:
 *
 *   - Zero component edits needed. All 36 files keep working.
 *   - Light/dark mode auto-switches via [data-theme="dark"] on <html>.
 *   - Anywhere you want the new tokens directly, use var(--xxx) in CSS
 *     or read them off the same object.
 *
 * If you later want to rip out the bridge and adopt CSS variables natively,
 * delete this file and replace `theme.X` references with `var(--X)`.
 */

export const theme = {
  colors: {
    // Primary brand: wine red (was #6B1A2A)
    brand:       'var(--color-primary)',
    brandDark:   'var(--wine-800)',

    // Value flag: muted gold
    gold:        'var(--color-value)',

    // Warm parchment background (was cream #FAF3E8)
    cream:       'var(--ink-50)',

    // Foreground hierarchy
    text:        'var(--fg-1)',
    textMuted:   'var(--fg-2)',

    // Surfaces
    surface:     'var(--bg-surface)',
    border:      'var(--border)',

    // Status / match colors
    success:     'var(--wine-600)',           // wine-toned positive (no traffic-light green)
    warning:     'var(--gold-700)',
    crowd:       'var(--color-taste)',        // violet for crowd / taste-fit

    matchHigh:   'var(--color-primary)',
    matchMid:    'var(--color-value)',
    matchLow:    'var(--ink-300)',

    // Badge backgrounds (subtle tints)
    crowdBg:     'var(--color-taste-subtle)',
    valueBg:     'var(--color-value-subtle)',
    bestMatchBg: 'var(--color-primary-subtle)',
    criticBg:    'var(--color-primary)',

    // Misc
    dotEmpty:    'var(--ink-200)',
    barTrack:    'var(--bg-raised)',
  },

  typography: {
    // Display: Cormorant Garamond (was Georgia)
    fontSerif: "var(--font-display)",
    // UI: Outfit (was system stack)
    fontSans:  "var(--font-body)",

    // Sizes lifted to the new scale (slightly larger, more editorial)
    sizes: {
      xs:   'var(--text-xs)',    // 11
      sm:   'var(--text-sm)',    // 13
      md:   'var(--text-base)',  // 15
      lg:   'var(--text-md)',    // 17
      xl:   'var(--text-lg)',    // 20
      xxl:  'var(--text-xl)',    // 24
      xxxl: 'var(--text-3xl)',   // 38 (more dramatic for hero moments)
    },

    weights: {
      normal: 400,
      medium: 500,
    },
  },

  spacing: {
    xs:  'var(--space-1)',   // 4
    sm:  'var(--space-2)',   // 8
    md:  'var(--space-3)',   // 12
    lg:  'var(--space-4)',   // 16
    xl:  'var(--space-6)',   // 24
    xxl: 'var(--space-8)',   // 32
  },

  radius: {
    sm:   'var(--radius-sm)',     // 8
    md:   'var(--radius-md)',     // 16
    lg:   'var(--radius-lg)',     // 24
    pill: 'var(--radius-full)',   // 9999
  },

  shadows: {
    card:     'var(--shadow-sm)',
    elevated: 'var(--shadow-md)',
  },
}
