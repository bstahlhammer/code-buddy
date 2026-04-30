import { theme } from '../theme/theme.js'

const TABS = [
  { id: 'home',    label: 'Home',    icon: '⌂' },
  { id: 'history', label: 'History', icon: '◷' },
  { id: 'profile', label: 'Profile', icon: '◎' },
]

export default function BottomNav({ activeTab, navigate }) {
  function handleTab(id) {
    if (id === 'home')    navigate('home')
    if (id === 'history') navigate('history')
    if (id === 'profile') navigate('profile')
  }

  return (
    <div
      style={{
        display: 'flex',
        borderTop: `0.5px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
        flexShrink: 0,
      }}
    >
      {TABS.map(tab => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => handleTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0 10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              gap: 2,
            }}
          >
            <span style={{ fontSize: 20, color: active ? theme.colors.ember : theme.colors.textMuted }}>
              {tab.icon}
            </span>
            <span
              style={{
                fontSize: theme.typography.sizes.xs,
                fontFamily: theme.typography.fontSans,
                color: active ? theme.colors.ember : theme.colors.textMuted,
                fontWeight: active ? 500 : 400,
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
