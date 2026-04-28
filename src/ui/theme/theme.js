export const theme = {
  colors: {
    // Core palette — Forge: Ember & Tide
    // Deep navy (velvet) + ember orange/red (flame) + tide blue (accent)
    brand:      '#162969',   // Forge navy (deep)
    brandDark:  '#0B142E',   // near-black navy
    brandDeep:  '#1B2E73',   // mid navy for layering
    gold:       '#FF5F0E',   // ember orange (alias kept for compatibility)
    goldBright: '#FF8048',   // bright ember highlight (alias)
    ember:      '#FF5F0E',
    emberBright:'#FF8048',
    crimson:    '#B61E23',   // deep crimson (flame tip)
    crimsonSoft:'#B8555C',   // muted rose
    tide:       '#5EAAE6',   // mid Forge blue
    tideLight:  '#81C3E4',   // pale tide
    tideDeep:   '#2250B7',   // royal Forge blue
    cream:      '#F4EBD9',   // warm parchment kept for warmth
    parchment:  '#EFE4CC',   // aged parchment for cards on dark
    text:       '#0F1A33',   // deep navy ink
    textMuted:  '#5A6788',   // dusty navy
    textOnDark: '#E8EEF8',   // pale on navy surfaces
    surface:    '#FBF8F2',   // off-white warm surface
    surfaceAlt: '#F1EEE5',   // alternate card surface
    border:     '#D7DCE8',   // soft cool edge
    borderDark: '#22356E',   // navy border on dark
    success:    '#2F8F4E',
    warning:    '#FF8048',
    crowd:      '#2250B7',   // royal blue
    matchHigh:  '#2F8F4E',
    matchMid:   '#FF8048',
    matchLow:   '#B61E23',
    crowdBg:    '#E1EAF8',
    valueBg:    '#FFE7D6',
    bestMatchBg:'#E1F0E5',
    criticBg:   '#162969',
    dotEmpty:   '#D7DCE8',
    barTrack:   '#E8EEF8',
  },
  typography: {
    // Transitional serif (display) + refined sans (body)
    fontSerif: "'Cormorant Garamond', 'Cormorant', Garamond, 'EB Garamond', Georgia, serif",
    fontDisplay: "'Cormorant Garamond', 'Cormorant', Garamond, Georgia, serif",
    fontSans:  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    sizes: {
      xs:   '11px',
      sm:   '12px',
      md:   '14px',
      lg:   '16px',
      xl:   '20px',
      xxl:  '26px',
      xxxl: '36px',
    },
    weights: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
  },
  spacing: {
    xs:  '4px',
    sm:  '8px',
    md:  '12px',
    lg:  '16px',
    xl:  '24px',
    xxl: '36px',
  },
  radius: {
    sm:   '4px',
    md:   '8px',
    lg:   '14px',
    pill: '100px',
  },
  shadows: {
    card:     '0 2px 8px rgba(15, 31, 24, 0.08), 0 1px 2px rgba(15, 31, 24, 0.04)',
    elevated: '0 12px 32px rgba(15, 31, 24, 0.18), 0 2px 6px rgba(15, 31, 24, 0.08)',
    brass:    '0 0 0 1px rgba(176, 141, 62, 0.3), 0 4px 16px rgba(15, 31, 24, 0.2)',
  },
}
