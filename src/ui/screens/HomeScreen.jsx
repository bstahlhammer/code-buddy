import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'
import { useScanHistory } from '../hooks/useScanHistory.js'
import { formatScanDate } from '../utils/formatScan.js'
import logoWatercolor from '@/assets/logo-watercolor.png'

function LogoRing() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
      <div style={{
        width: 180, height: 180,
        borderRadius: '50%',
        background: `radial-gradient(circle at 50% 45%, ${theme.colors.cream} 0%, ${theme.colors.parchment} 100%)`,
        border: `2.5px solid ${theme.colors.peach}bb`,
        boxShadow: `0 0 0 5px ${theme.colors.surface}, ${theme.shadows.card}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <img
          src={logoWatercolor}
          alt="Uncork"
          width={155}
          height={155}
          style={{ width: 155, height: 155, objectFit: 'contain', mixBlendMode: 'multiply' }}
        />
      </div>
    </div>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.3 0-11.5-5.2-11.5-11.5S17.7 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.3 29.1 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.6l-6-5.1c-1.9 1.3-4.3 2.2-7 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 39 16.3 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l6 5.1c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  )
}

function SectionLabel({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: theme.spacing.md }}>
      <span style={{ flex: 1, height: 1, background: theme.colors.border }} />
      <span style={{
        fontSize: 10, fontFamily: theme.typography.fontSans, fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: theme.colors.textMuted,
      }}>{label}</span>
      <span style={{ flex: 1, height: 1, background: theme.colors.border }} />
    </div>
  )
}

function TasteProfileCard({ tasteProfile, onTap }) {
  const archetype = tasteProfile?.name || tasteProfile?.archetype?.name || 'Your taste profile'
  const description = tasteProfile?.description || tasteProfile?.archetype?.description || ''
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%', textAlign: 'left',
        padding: theme.spacing.md,
        background: theme.colors.surface,
        border: `1px solid ${theme.colors.tide}`,
        borderRadius: theme.radius.lg,
        cursor: 'pointer',
        boxShadow: theme.shadows.card,
      }}
    >
      <div style={{
        fontSize: 10, fontFamily: theme.typography.fontSans, fontWeight: 700,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        color: theme.colors.tideDeep, marginBottom: 4,
      }}>
        Your taste profile
      </div>
      <div style={{
        fontFamily: theme.typography.fontDisplay,
        fontSize: 22, color: theme.colors.text, lineHeight: 1.1,
        marginBottom: description ? 6 : 0,
      }}>
        {archetype}
      </div>
      {description && (
        <div style={{
          fontFamily: theme.typography.fontSans,
          fontSize: 13, color: theme.colors.textMuted, lineHeight: 1.4,
        }}>
          {description}
        </div>
      )}
    </button>
  )
}

function RecentScansStrip({ scans, onOpen, onAddWine }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {scans.map(s => {
        const date = formatScanDate(s.created_at)
        const place = (s.location_label || '').trim()
        const primary = date ? `Scan from ${date}` : `${s.wine_count} wine${s.wine_count === 1 ? '' : 's'} scanned`
        return (
          <button
            key={s.id}
            onClick={() => onOpen?.(s)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', textAlign: 'left',
              padding: '10px 14px',
              background: theme.colors.surfaceAlt,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.sm,
              color: theme.colors.text,
              fontFamily: theme.typography.fontSans,
              fontSize: 13, cursor: 'pointer', gap: 10,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {primary}
              {place && <span style={{ color: theme.colors.textMuted }}> · {place}</span>}
            </span>
            <span style={{ color: theme.colors.textMuted, fontSize: 11, flexShrink: 0 }}>Tell us →</span>
          </button>
        )
      })}
    </div>
  )
}

export default function HomeScreen({ navigate, auth, tasteProfile, onEmailSignIn, onOpenScan, onAddWine }) {
  const user = auth?.user
  const profileName = auth?.profile?.display_name
  const initial = (profileName || user?.email || '?').trim()[0]?.toUpperCase() ?? '?'
  const hasProfile = !!tasteProfile

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const { listScans } = useScanHistory()

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      const { scans } = await listScans()
      if (!cancelled) setRecentScans((scans || []).slice(0, 3))
    })()
    return () => { cancelled = true }
  }, [user, listScans])

  async function handleGoogle() {
    setError(null); setBusy(true)
    const r = await auth?.signInWithGoogle?.()
    if (r?.error) { setError(r.error.message || 'Google sign-in failed'); setBusy(false) }
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      backgroundColor: theme.colors.surface,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Watercolor wash — sage/mint at top, warm cream at bottom */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%', width: '80%', height: '65%',
          background: theme.colors.tideLight, opacity: 0.28, filter: 'blur(80px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', top: '-10%', right: '-20%', width: '65%', height: '55%',
          background: theme.colors.tide, opacity: 0.18, filter: 'blur(70px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-5%', right: '-10%', width: '60%', height: '50%',
          background: theme.colors.peach, opacity: 0.15, filter: 'blur(90px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '15%', left: '-15%', width: '55%', height: '45%',
          background: theme.colors.magenta, opacity: 0.06, filter: 'blur(75px)', borderRadius: '50%',
        }} />
      </div>

      {/* Account chip */}
      {user && (
        <div style={{ position: 'absolute', top: theme.spacing.lg, right: theme.spacing.lg, zIndex: 2 }}>
          <a
            href="/account"
            title="Account"
            aria-label="Account"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold})`,
              color: theme.colors.brandDark,
              fontFamily: theme.typography.fontSans,
              fontWeight: 700, fontSize: 13,
              textDecoration: 'none',
              boxShadow: theme.shadows.card,
            }}
          >
            {initial}
          </a>
        </div>
      )}

      {/* Scrollable content */}
      <div
        className="hide-scrollbar"
        style={{
          flex: 1, overflowY: 'auto',
          padding: `48px ${theme.spacing.xl} ${theme.spacing.xl}`,
          display: 'flex', flexDirection: 'column',
          position: 'relative',
        }}
      >
        <LogoRing />

        {user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>

            {/* Primary CTA */}
            <button
              onClick={() => navigate('scanPrompt')}
              style={{
                width: '100%', padding: '16px',
                background: theme.colors.tideDeep,
                color: theme.colors.cream,
                border: 'none', borderRadius: theme.radius.pill,
                fontSize: 15, fontWeight: 600,
                fontFamily: theme.typography.fontSans,
                cursor: 'pointer',
                boxShadow: `0 4px 16px ${theme.colors.tideDeep}44`,
              }}
            >
              {hasProfile ? "Scan to find a wine I'll love" : 'Scan a wine list, shelf or bottle'}
            </button>

            {/* Secondary CTA */}
            <button
              onClick={onAddWine}
              style={{
                width: '100%', padding: '15px',
                background: 'transparent',
                color: theme.colors.tideDeep,
                border: `1.5px solid ${theme.colors.tide}`,
                borderRadius: theme.radius.pill,
                fontSize: 15, fontWeight: 500,
                fontFamily: theme.typography.fontSans,
                cursor: 'pointer',
              }}
            >
              Rate a wine I tried
            </button>

            {/* Build profile prompt (no profile yet) */}
            {!hasProfile && (
              <button
                onClick={() => navigate('quizIntro')}
                style={{
                  width: '100%', padding: '15px',
                  background: 'transparent',
                  color: theme.colors.text,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radius.pill,
                  fontSize: 14, fontWeight: 500,
                  fontFamily: theme.typography.fontSans,
                  cursor: 'pointer',
                }}
              >
                Build my taste profile
              </button>
            )}

            {/* Taste profile section */}
            {hasProfile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                <SectionLabel label="Your taste" />
                <TasteProfileCard tasteProfile={tasteProfile} onTap={() => navigate('profile')} />
                <button
                  onClick={() => navigate('quizIntro')}
                  style={{
                    background: 'none', border: 'none',
                    color: theme.colors.tideDeep,
                    fontSize: 12, fontFamily: theme.typography.fontSans,
                    cursor: 'pointer', textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    alignSelf: 'center', padding: 4,
                  }}
                >
                  Update my taste profile
                </button>
              </div>
            )}

            {/* Recent scans */}
            {hasProfile && recentScans.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
                <SectionLabel label="Recent scans" />
                <RecentScansStrip scans={recentScans} onOpen={onOpenScan} onAddWine={onAddWine} />
              </div>
            )}

          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>

            <button
              onClick={handleGoogle}
              disabled={busy}
              style={{
                width: '100%', padding: '16px',
                background: theme.colors.cream,
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.pill,
                fontFamily: theme.typography.fontSans,
                fontSize: 14, fontWeight: 600,
                cursor: busy ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: theme.shadows.card,
              }}
            >
              <GoogleLogo />
              Continue with Google
            </button>

            <button
              onClick={() => onEmailSignIn?.()}
              disabled={busy}
              style={{
                width: '100%', padding: '15px',
                backgroundColor: 'transparent',
                color: theme.colors.tideDeep,
                border: `1.5px solid ${theme.colors.tide}`,
                borderRadius: theme.radius.pill,
                fontSize: 14, fontWeight: 500,
                fontFamily: theme.typography.fontSans,
                cursor: busy ? 'wait' : 'pointer',
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              Sign in with email
            </button>

            {error && (
              <div style={{
                color: theme.colors.crimson, fontFamily: theme.typography.fontSans,
                fontSize: 12, textAlign: 'center', marginTop: 4,
              }}>{error}</div>
            )}

            <div style={{
              marginTop: theme.spacing.md,
              display: 'flex', justifyContent: 'center', gap: 18,
              fontFamily: theme.typography.fontSans,
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              <a href="/privacy" style={{ color: theme.colors.tide, textDecoration: 'none' }}>Privacy</a>
              <a href="/terms" style={{ color: theme.colors.tide, textDecoration: 'none' }}>Terms</a>
            </div>

            <p style={{
              marginTop: 4, textAlign: 'center', maxWidth: 280, margin: '4px auto 0',
              fontFamily: theme.typography.fontSans,
              fontSize: 11, color: theme.colors.textMuted, lineHeight: 1.5,
            }}>
              By continuing you confirm you&rsquo;re of legal drinking age and agree to our Terms.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
