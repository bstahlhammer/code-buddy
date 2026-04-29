import { theme } from '../theme/theme.js'

const ROLE_META = {
  topPick: {
    label: '✦ Top Pick ✦',
    accent: theme.colors.gold,
    glow: theme.shadows.brass,
  },
  bestValue: {
    label: 'Best Value',
    accent: theme.colors.tide || theme.colors.gold,
    glow: theme.shadows.card,
  },
  crowdPleaser: {
    label: 'Crowd Pleaser',
    accent: theme.colors.crimson || theme.colors.gold,
    glow: theme.shadows.card,
  },
}

export default function HeroPickCard({ role, wine, reasoning, onTap }) {
  const meta = ROLE_META[role] || ROLE_META.topPick
  const priceStr = wine.price && wine.price !== '—' && String(wine.price).trim() !== ''
    ? (String(wine.price).startsWith('$') ? wine.price : `$${wine.price}`)
    : null
  const subline = [wine.vintage, wine.region, wine.grape, priceStr].filter(v => v && String(v).trim() !== '').join(' · ')

  return (
    <button
      onClick={() => onTap?.(wine)}
      style={{
        width: '100%',
        backgroundColor: theme.colors.surface,
        backgroundImage: `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceAlt} 100%)`,
        border: `1px solid ${meta.accent}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.lg,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: meta.glow,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
        position: 'relative',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = theme.shadows.elevated }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = meta.glow }}
    >
      {/* Role overline */}
      <div style={{
        fontSize: '10px',
        color: meta.accent,
        fontFamily: theme.typography.fontSans,
        fontWeight: 600,
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
      }}>
        {meta.label}
      </div>

      {/* Wine name */}
      <div style={{
        fontSize: '22px',
        fontWeight: 500,
        color: theme.colors.text,
        fontFamily: theme.typography.fontDisplay,
        lineHeight: 1.2,
        letterSpacing: '0.005em',
      }}>
        {wine.name}
      </div>

      {/* Sub-meta */}
      {subline && (
        <div style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {subline}
        </div>
      )}

      {/* What to say to the server */}
      {reasoning && (
        <div style={{
          marginTop: theme.spacing.xs,
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          backgroundColor: `${meta.accent}10`,
          border: `1px solid ${meta.accent}30`,
          borderRadius: theme.radius.sm,
        }}>
          <div style={{
            fontSize: '10px',
            color: meta.accent,
            fontFamily: theme.typography.fontSans,
            fontWeight: 600,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            What to say
          </div>
          <div style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text,
            fontFamily: theme.typography.fontDisplay,
            fontStyle: 'italic',
            lineHeight: 1.45,
          }}>
            “{reasoning}”
          </div>
        </div>
      )}

      {/* Confidence callout */}
      {typeof wine.confidence === 'number' && wine.confidence < 70 && (
        <div style={{
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,
          letterSpacing: '0.04em',
        }}>
          Read at {wine.confidence}% confidence — verify the label
        </div>
      )}
    </button>
  )
}
