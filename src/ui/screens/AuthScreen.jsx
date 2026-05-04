import { useState } from 'react'
import { theme } from '../theme/theme.js'
import { useAuth } from '../hooks/useAuth.js'

function BrassDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: `${theme.spacing.lg} 0` }}>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}80, transparent)` }} />
      <span style={{
        fontFamily: theme.typography.fontSans,
        fontSize: 10,
        letterSpacing: '0.28em',
        color: theme.colors.gold,
        textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}80, transparent)` }} />
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '14px',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${theme.colors.gold}55`,
  borderRadius: theme.radius.sm,
  color: theme.colors.cream,
  fontFamily: theme.typography.fontSans,
  fontSize: 14,
  outline: 'none',
  marginBottom: theme.spacing.md,
}

export default function AuthScreen({ goBack, onAuthed, authMode = 'full' }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const showGoogle = authMode !== 'email'
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setError(null); setBusy(true)
    const r = await signInWithGoogle()
    if (r?.error) { setError(r.error.message || 'Google sign-in failed'); setBusy(false) }
    // if redirected, browser leaves the page
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null); setInfo(null); setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await signInWithEmail(email, password)
        if (error) throw error
        onAuthed?.()
      } else {
        const { data, error } = await signUpWithEmail(email, password, displayName)
        if (error) throw error
        if (data.session) onAuthed?.()
        else setInfo('Account created, you can sign in now.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      background: `radial-gradient(ellipse at top, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 80%)`,
      padding: `${theme.spacing.xl} ${theme.spacing.xl}`,
      overflowY: 'auto',
    }}>
      <button
        onClick={goBack}
        style={{
          background: 'none', border: 'none', color: theme.colors.gold,
          fontFamily: theme.typography.fontSans, fontSize: 12, letterSpacing: '0.2em',
          textTransform: 'uppercase', cursor: 'pointer', alignSelf: 'flex-start',
          marginBottom: theme.spacing.lg,
        }}
      >← Back</button>

      <div style={{ textAlign: 'center', marginBottom: theme.spacing.xl }}>
        <div style={{
          fontFamily: theme.typography.fontSans, fontSize: 10,
          letterSpacing: '0.32em', color: theme.colors.gold,
          textTransform: 'uppercase', marginBottom: theme.spacing.sm,
        }}>
          {mode === 'signin' ? 'Welcome Back' : 'Join the Cellar'}
        </div>
        <h1 style={{
          fontFamily: theme.typography.fontDisplay,
          fontSize: 40,
          color: theme.colors.cream, lineHeight: 1, margin: 0,
          letterSpacing: '0.02em',
        }}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>
      </div>

      {showGoogle && (
        <>
          <button
            onClick={handleGoogle}
            disabled={busy}
            style={{
              width: '100%', padding: '14px',
              background: theme.colors.cream,
              color: theme.colors.text,
              border: 'none',
              borderRadius: theme.radius.sm,
              fontFamily: theme.typography.fontSans,
              fontSize: 14, fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-1.9 1.3-4.3 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39 16.3 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6 5.1c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>

          <BrassDivider label="or" />
        </>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={inputStyle}
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          style={inputStyle}
        />

        {error && (
          <div style={{
            color: '#E8B4B4', fontFamily: theme.typography.fontSans, fontSize: 13,
            marginBottom: theme.spacing.md, textAlign: 'center',
          }}>{error}</div>
        )}
        {info && (
          <div style={{
            color: theme.colors.goldBright, fontFamily: theme.typography.fontSans, fontSize: 13,
            marginBottom: theme.spacing.md, textAlign: 'center',
          }}>{info}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%', padding: '16px',
            background: `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`,
            color: theme.colors.brandDark,
            border: 'none', borderRadius: theme.radius.sm,
            fontFamily: theme.typography.fontSans,
            fontSize: 14, fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            cursor: busy ? 'wait' : 'pointer',
            boxShadow: theme.shadows.brass,
          }}
        >
          {busy ? '…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>
      </form>

      <button
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setInfo(null) }}
        style={{
          background: 'none', border: 'none',
          color: theme.colors.parchment, opacity: 0.8,
          fontFamily: theme.typography.fontDisplay,
          fontSize: 15, marginTop: theme.spacing.lg, cursor: 'pointer',
        }}
      >
        {mode === 'signin'
          ? ", don't have an account? create one ,"
          : ', already have an account? sign in ,'}
      </button>

      <div style={{
        marginTop: theme.spacing.xl,
        paddingTop: theme.spacing.lg,
        borderTop: `1px solid ${theme.colors.gold}30`,
        display: 'flex', justifyContent: 'center', gap: 18,
        fontFamily: theme.typography.fontSans,
        fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
      }}>
        <a href="/privacy" style={{ color: theme.colors.gold, textDecoration: 'none', opacity: 0.8 }}>Privacy</a>
        <a href="/terms" style={{ color: theme.colors.gold, textDecoration: 'none', opacity: 0.8 }}>Terms</a>
      </div>

      <p style={{
        marginTop: theme.spacing.md,
        textAlign: 'center',
        fontFamily: theme.typography.fontSans,
        fontSize: 11, color: `${theme.colors.parchment}80`, lineHeight: 1.5,
      }}>
        By continuing you confirm you&rsquo;re of legal drinking age and agree to our Terms.
      </p>
    </div>
  )
}
