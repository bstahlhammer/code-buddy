import { useRef } from 'react'
import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'

export default function ScanPromptScreen({ navigate, goBack, onScan }) {
  const fileRef = useRef(null)

  const pick = () => fileRef.current?.click()

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    onScan?.(file)
    navigate('scanning')
    e.target.value = ''
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg} ${theme.spacing.lg}` }}>
          <h1 style={{ fontFamily: theme.typography.fontDisplay, fontSize: theme.typography.sizes.xxl, color: theme.colors.cream, fontWeight: theme.typography.weights.normal, letterSpacing: '0.02em' }}>
            Show me the wine
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}b0`, fontFamily: theme.typography.fontSans, marginTop: theme.spacing.xs, lineHeight: 1.5 }}>
            Snap a wine list, a store shelf, or a single bottle — I’ll do the rest.
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl, gap: theme.spacing.lg }}>
        <div style={{ fontSize: 64, lineHeight: 1, opacity: 0.9 }} aria-hidden="true">📸</div>
        <p style={{
          textAlign: 'center', maxWidth: 280,
          fontFamily: theme.typography.fontDisplay,
          fontSize: 16, fontStyle: 'italic',
          color: theme.colors.textMuted, lineHeight: 1.5,
        }}>
          A clear, well-lit photo gives the best matches.
        </p>

        <button
          onClick={pick}
          style={{
            width: '100%', padding: '20px',
            background: `linear-gradient(180deg, ${theme.colors.magentaBright} 0%, ${theme.colors.magenta} 100%)`,
            color: theme.colors.cream,
            border: 'none', borderRadius: theme.radius.sm,
            fontSize: 15, fontWeight: 700,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            letterSpacing: '0.08em', textTransform: 'uppercase',
            boxShadow: theme.shadows.brass,
          }}
        >
          Take or upload a photo
        </button>

        <button
          onClick={() => navigate('quizIntro')}
          style={{
            background: 'none',
            border: 'none',
            color: theme.colors.brand,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Build my taste profile first →
        </button>
      </div>
    </div>
  )
}
