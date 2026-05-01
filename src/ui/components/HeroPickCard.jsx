import { theme } from '../theme/theme.js'
import MatchScore from './MatchScore.jsx'

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

export default function HeroPickCard({ role, wine, reasoning, ctaLabel, onCta, onTap, matchScore, matchExplanation }) {
  const meta = ROLE_META[role] || ROLE_META.topPick
  const priceStr = wine.price && wine.price !== ',' && String(wine.price).trim() !== ''
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
      {/* Role overline + match chip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
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
        {typeof matchScore === 'number' && (
          <MatchScore score={matchScore} explanation={matchExplanation} compact />
        )}
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

      {/* Why this wine — rational note */}
      {reasoning && (
        <div style={{ marginTop: theme.spacing.xs }}>
          <div style={{
            fontSize: '10px',
            color: meta.accent,
            fontFamily: theme.typography.fontSans,
            fontWeight: 600,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            Why this wine
          </div>
          <div style={{
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.text,
            fontFamily: theme.typography.fontSans,
            lineHeight: 1.5,
          }}>
            {reasoning}
          </div>
        </div>
      )}

      {/* Joyful CTA — only on Top Pick when no profile yet */}
      {ctaLabel && onCta && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onCta() }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCta() } }}
          style={{
            marginTop: theme.spacing.xs,
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            background: `linear-gradient(135deg, ${theme.colors.gold} 0%, ${theme.colors.goldBright} 100%)`,
            color: theme.colors.brandDark,
            borderRadius: theme.radius.sm,
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizes.sm,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          {ctaLabel} →
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

