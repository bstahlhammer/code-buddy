import { theme } from '../theme/theme.js'

export default function UpsellBanner({ onCta }) {
  return (
    <div
      style={{
        margin: `${theme.spacing.md} ${theme.spacing.lg}`,
        padding: theme.spacing.lg,
        background: `linear-gradient(135deg, ${theme.colors.brand} 0%, ${theme.colors.brandDeep} 100%)`,
        border: `1px solid ${theme.colors.gold}`,
        borderRadius: theme.radius.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        boxShadow: theme.shadows.brass,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '16px', color: theme.colors.cream, fontFamily: theme.typography.fontDisplay, fontStyle: 'italic', lineHeight: 1.3, letterSpacing: '0.01em' }}>
          See which of these matches your taste
        </div>
        <div style={{ fontSize: '10px', color: theme.colors.gold, fontFamily: theme.typography.fontSans, marginTop: 4, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500 }}>
          90 seconds · no sign-up
        </div>
      </div>
      <button
        onClick={onCta}
        style={{
          padding: '10px 18px',
          background: `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`,
          color: theme.colors.brandDark,
          border: 'none',
          borderRadius: theme.radius.sm,
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: theme.typography.fontSans,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        Match me →
      </button>
    </div>
  )
}
