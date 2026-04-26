import { theme } from '../theme/theme.js'

/**
 * Elegant tappable option card for the guided quiz.
 * Velvet & Brass aesthetic: parchment surface, brass border on selected,
 * serif label + small sans hint.
 */
export default function QuizOptionCard({ label, hint, selected, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: `${theme.spacing.lg} ${theme.spacing.lg}`,
        backgroundColor: selected ? theme.colors.surfaceAlt : theme.colors.surface,
        border: `1px solid ${selected ? theme.colors.gold : theme.colors.border}`,
        borderRadius: theme.radius.md,
        boxShadow: selected ? theme.shadows.brass : theme.shadows.card,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.md,
        transition: 'all 0.15s ease',
        outline: 'none',
        position: 'relative',
      }}
      onFocus={e => { e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.gold}40` }}
      onBlur={e => { e.currentTarget.style.boxShadow = selected ? theme.shadows.brass : theme.shadows.card }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.lg,
            color: theme.colors.text,
            lineHeight: 1.25,
            fontWeight: theme.typography.weights.normal,
          }}
        >
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.textMuted,
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <div
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: `1.5px solid ${selected ? theme.colors.gold : theme.colors.border}`,
          backgroundColor: selected ? theme.colors.gold : 'transparent',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.cream,
          fontSize: 14,
          fontWeight: 700,
          transition: 'all 0.15s ease',
        }}
      >
        {selected ? '✓' : ''}
      </div>
    </button>
  )
}
