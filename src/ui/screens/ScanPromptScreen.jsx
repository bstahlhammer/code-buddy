import { useRef, useState } from 'react'
import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'

const MODES = [
  {
    id: 'list',
    emoji: '📋',
    label: 'Wine List',
    tip: 'Hold steady over the full page. Any light is fine.',
  },
  {
    id: 'shelf',
    emoji: '🍷',
    label: 'Store Shelf',
    tip: 'Get within arm\'s reach — labels need to fill the frame.',
  },
  {
    id: 'bottle',
    emoji: '📷',
    label: 'Single Bottle',
    tip: 'Front label centered, fills most of the shot.',
  },
]

export default function ScanPromptScreen({ navigate, goBack, onScan, tasteProfile }) {
  const fileRef = useRef(null)
  const [mode, setMode] = useState('list')

  const pick = () => fileRef.current?.click()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onScan?.(file, mode)
    navigate('scanning')
    e.target.value = ''
  }

  const selectedMode = MODES.find(m => m.id === mode) ?? MODES[0]

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      backgroundColor: theme.colors.surface, position: 'relative', overflow: 'hidden',
    }}>
      {/* Watercolor blobs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '-15%', width: '70%', height: '60%',
          background: theme.colors.tideLight, opacity: 0.22, filter: 'blur(80px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '-15%', width: '65%', height: '55%',
          background: theme.colors.peach, opacity: 0.14, filter: 'blur(90px)', borderRadius: '50%',
        }} />
      </div>

      {/* Header */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0, position: 'relative', zIndex: 1 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg} ${theme.spacing.lg}` }}>
          <h1 style={{
            fontFamily: theme.typography.fontDisplay,
            fontSize: theme.typography.sizes.xxl,
            color: theme.colors.cream,
            fontWeight: theme.typography.weights.normal,
            letterSpacing: '0.02em',
          }}>
            Show me the wine
          </h1>
          <p style={{
            fontSize: theme.typography.sizes.sm,
            color: `${theme.colors.cream}b0`,
            fontFamily: theme.typography.fontSans,
            marginTop: theme.spacing.xs,
            lineHeight: 1.5,
          }}>
            Choose what you're scanning, then take a photo.
          </p>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        padding: theme.spacing.xl, gap: theme.spacing.lg,
        position: 'relative', zIndex: 1,
      }}>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          {MODES.map(m => {
            const active = mode === m.id
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{
                  flex: 1,
                  padding: '12px 6px',
                  borderRadius: theme.radius.md,
                  border: `1.5px solid ${active ? theme.colors.tideDeep : theme.colors.border}`,
                  background: active ? `${theme.colors.tideLight}40` : theme.colors.cream,
                  color: active ? theme.colors.tideDeep : theme.colors.textMuted,
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  boxShadow: active ? `0 0 0 3px ${theme.colors.tideLight}60` : theme.shadows.card,
                  transition: 'border-color 150ms, background 150ms',
                }}
              >
                <span style={{ fontSize: 22 }}>{m.emoji}</span>
                <span style={{
                  fontFamily: theme.typography.fontSans,
                  fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{m.label}</span>
              </button>
            )
          })}
        </div>

        {/* Mode-specific tip */}
        <div style={{
          padding: `${theme.spacing.sm} ${theme.spacing.md}`,
          borderRadius: theme.radius.sm,
          background: `${theme.colors.tideLight}30`,
          border: `1px solid ${theme.colors.tide}55`,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
          <span style={{
            fontFamily: theme.typography.fontSans,
            fontSize: 13, color: theme.colors.text, lineHeight: 1.5,
          }}>
            {selectedMode.tip}
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* CTA */}
        <button
          onClick={pick}
          style={{
            width: '100%', padding: '18px',
            background: theme.colors.tideDeep,
            color: theme.colors.cream,
            border: 'none', borderRadius: theme.radius.pill,
            fontSize: 15, fontWeight: 700,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            letterSpacing: '0.04em',
            boxShadow: `0 4px 16px ${theme.colors.tideDeep}44`,
          }}
        >
          Take or choose a photo
        </button>

        {!tasteProfile && (
          <button
            onClick={() => navigate('quizIntro')}
            style={{
              background: 'none', border: 'none',
              color: theme.colors.tideDeep,
              fontSize: theme.typography.sizes.sm,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: '4px 0',
              alignSelf: 'center',
            }}
          >
            Build my taste profile first →
          </button>
        )}
      </div>
    </div>
  )
}
