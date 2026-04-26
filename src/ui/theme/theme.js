export const theme = {
  colors: {
    // Core palette — Velvet & Brass
    brand:      '#1F3A2E',   // deep forest green (velvet)
    brandDark:  '#0F1F18',   // near-black forest
    brandDeep:  '#16271F',   // mid forest for layering
    gold:       '#B08D3E',   // brushed brass
    goldBright: '#D4AF6A',   // polished brass highlight
    cream:      '#F4EBD9',   // warm parchment
    parchment:  '#EFE4CC',   // aged parchment for cards on dark
    text:       '#1A1815',   // ink black with warm undertone
    textMuted:  '#6B5E4F',   // aged sepia
    textOnDark: '#E8DEC8',   // parchment text on dark surfaces
    surface:    '#FBF6EB',   // off-white parchment surface
    surfaceAlt: '#F4EBD9',   // alternate card surface
    border:     '#D9CBA8',   // soft parchment edge
    borderDark: '#2A4034',   // forest border on dark
    success:    '#3D6B47',
    warning:    '#8C6B1F',
    crowd:      '#5C3A6B',   // muted aubergine
    matchHigh:  '#3D6B47',
    matchMid:   '#8C6B1F',
    matchLow:   '#8C2D2D',
    // badge backgrounds
    crowdBg:    '#EBE3F0',
    valueBg:    '#F5E9C9',
    bestMatchBg:'#E3EDDF',
    criticBg:   '#1F3A2E',
    // dot empty
    dotEmpty:   '#D9CBA8',
    // score bar track
    barTrack:   '#E8DEC8',
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
