import { theme } from '../theme/theme.js'
import { getTasteProfiles } from '@/core/api'

const ICONS = {
  'bold-red':      '🔥',
  'elegant-red':   '🍂',
  'rich-white':    '🌅',
  'crisp-white':   '🌊',
  'sweet-sipper':  '🌸',
  'crowd-pleaser': '✨',
}

/**
 * Visual archetype picker. User taps a card to seed their palate from a
 * preset taste profile. Selection is a soft signal — they can still describe
 * or rate bottles, and signals blend together in deriveProfile.
 */
export default function ArchetypePicker({ value, onChange }) {
  const profiles = getTasteProfiles()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
      {profiles.map(p => {
        const selected = value === p.id
        return (
          <button
            key={p.id}
            onClick={() => onChange(selected ? null : p.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              border: `1px solid ${selected ? theme.colors.gold : theme.colors.border}`,
              backgroundColor: selected ? `${theme.colors.gold}12` : theme.colors.surface,
              boxShadow: selected ? theme.shadows.brass : 'none',
              cursor: 'pointer',
              display: 'flex',
              gap: theme.spacing.md,
              alignItems: 'flex-start',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: `1px solid ${selected ? theme.colors.gold : theme.colors.border}`,
              backgroundColor: selected ? theme.colors.surface : theme.colors.surfaceAlt,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}>
              {ICONS[p.id] ?? '🍷'}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{
                fontFamily: theme.typography.fontSerif,
                fontStyle: 'italic',
                fontSize: theme.typography.sizes.lg,
                color: theme.colors.text,
                lineHeight: 1.2,
              }}>
                {p.name}
              </div>
              <div style={{
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.sm,
                color: theme.colors.textMuted,
                lineHeight: 1.4,
              }}>
                {p.description}
              </div>
              <div style={{
                marginTop: 4,
                fontSize: '10px',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: theme.colors.gold,
                fontFamily: theme.typography.fontSans,
                fontWeight: theme.typography.weights.medium,
              }}>
                Loves · {p.loves.slice(0, 3).join(' · ')}
              </div>
            </div>
            <div style={{
              alignSelf: 'center',
              fontSize: 18,
              color: selected ? theme.colors.gold : theme.colors.textMuted,
              fontFamily: theme.typography.fontSerif,
            }}>
              {selected ? '✓' : '›'}
            </div>
          </button>
        )
      })}
    </div>
  )
}
