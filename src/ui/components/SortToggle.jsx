import { theme } from '../theme/theme.js'

export default function SortToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = opt.value === value
        const highlight = opt.highlight && !active
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '6px 14px',
              borderRadius: theme.radius.pill,
              border: highlight
                ? 'none'
                : `1px solid ${active ? theme.colors.brand : theme.colors.border}`,
              background: highlight
                ? `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`
                : (active ? theme.colors.brand : 'transparent'),
              color: highlight
                ? theme.colors.brandDark
                : (active ? theme.colors.cream : theme.colors.textMuted),
              fontSize: theme.typography.sizes.sm,
              fontWeight: highlight ? theme.typography.weights.semibold : theme.typography.weights.medium,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              letterSpacing: highlight ? '0.04em' : 'normal',
              boxShadow: highlight ? theme.shadows.brass : 'none',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
