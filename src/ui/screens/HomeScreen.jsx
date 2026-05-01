import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'
import { useScanHistory } from '../hooks/useScanHistory.js'
import logoWatercolor from '@/assets/logo-watercolor.png'

function Monogram() {
  return (
    <div
      style={{
        width: 168,
        height: 168,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
        position: 'relative',
        borderRadius: '50%',
        // Cream "paper" disc so the watercolor mark reads on dark plum.
        background: `radial-gradient(circle at 50% 45%, ${theme.colors.cream} 0%, ${theme.colors.parchment} 75%, ${theme.colors.parchment} 100%)`,
        boxShadow: `0 0 0 1px ${theme.colors.magenta}55, 0 0 0 8px ${theme.colors.brandDark}, 0 0 0 9px ${theme.colors.magenta}33, 0 12px 36px ${theme.colors.brandDark}aa`,
        overflow: 'hidden',
      }}
    >
      <img
        src={logoWatercolor}
        alt="Wine Flight — watercolor wine glass with wing"
        width={150}
        height={150}
        style={{
          width: 150,
          height: 150,
          objectFit: 'contain',
          mixBlendMode: 'multiply',
        }}
      />
    </div>
  )
}

function BrassDivider({ width = 48 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 auto' }}>
      <span style={{ width, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}, transparent)` }} />
      <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: theme.colors.gold }} />
      <span style={{ width, height: 1, background: `linear-gradient(to right, transparent, ${theme.colors.gold}, transparent)` }} />
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

function TasteProfileCard({ tasteProfile, onTap }) {
  const archetype = tasteProfile?.name || tasteProfile?.archetype?.name || 'Your taste profile'
  const palate = tasteProfile?.palate || {}
  const dims = [
    { key: 'body',      label: 'Body' },
    { key: 'sweetness', label: 'Sweet' },
    { key: 'tannin',    label: 'Tannin' },
    { key: 'acidity',   label: 'Acid' },
  ]
  return (
    <button
      onClick={onTap}
      style={{
        width: '100%', textAlign: 'left',
        padding: theme.spacing.md,
        background: `linear-gradient(135deg, ${theme.colors.parchment}f5 0%, ${theme.colors.cream}f0 100%)`,
        border: `1px solid ${theme.colors.magenta}55`,
        borderRadius: theme.radius.md,
        cursor: 'pointer',
        boxShadow: `0 8px 24px ${theme.colors.brandDark}66`,
      }}
    >
      <div style={{
        fontSize: 10, fontFamily: theme.typography.fontSans, fontWeight: 700,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: theme.colors.magenta, marginBottom: 4,
      }}>
        Your taste profile
      </div>
      <div style={{
        fontFamily: theme.typography.fontDisplay,
        fontSize: 22, color: theme.colors.brand, lineHeight: 1.1,
        marginBottom: 10,
      }}>
        {archetype}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {dims.map(d => {
          const v = Math.max(0, Math.min(100, palate[d.key] ?? 0))
          return (
            <div key={d.key} style={{ flex: 1 }}>
              <div style={{
                height: 4, borderRadius: 2,
                background: `${theme.colors.brand}22`, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${v}%`, height: '100%',
                  background: `linear-gradient(90deg, ${theme.colors.magenta}, ${theme.colors.berry})`,
                }} />
              </div>
              <div style={{
                fontSize: 9, marginTop: 4,
                fontFamily: theme.typography.fontSans, color: theme.colors.brand,
                letterSpacing: '0.12em', textTransform: 'uppercase',
              }}>
                {d.label}
              </div>
            </div>
          )
        })}
      </div>
    </button>
  )
}

function RecentScansStrip({ scans, onOpen }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontFamily: theme.typography.fontSans, fontWeight: 700,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: `${theme.colors.cream}aa`, marginBottom: 8,
      }}>
        Pick up where you left off
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {scans.map(s => (
          <button
            key={s.id}
            onClick={() => onOpen?.(s)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', textAlign: 'left',
              padding: '10px 14px',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${theme.colors.cream}22`,
              borderRadius: theme.radius.sm,
              color: theme.colors.cream,
              fontFamily: theme.typography.fontSans,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.location_label || `${s.wine_count} wine${s.wine_count === 1 ? '' : 's'} scanned`}
            </span>
            <span style={{ opacity: 0.6, fontSize: 11 }}>Rate →</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function HomeScreen({ navigate, auth, tasteProfile, onEmailSignIn, onOpenScan }) {
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
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: `
          radial-gradient(ellipse 70% 50% at 18% 12%, ${theme.colors.magentaBright}55 0%, transparent 60%),
          radial-gradient(ellipse 60% 45% at 88% 22%, ${theme.colors.peach}40 0%, transparent 55%),
          radial-gradient(ellipse 80% 55% at 12% 95%, ${theme.colors.teal}50 0%, transparent 60%),
          radial-gradient(ellipse 65% 50% at 95% 88%, ${theme.colors.berry}66 0%, transparent 60%),
          radial-gradient(ellipse 90% 70% at 50% 50%, ${theme.colors.brandDeep}cc 0%, transparent 70%),
          linear-gradient(168deg, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 55%, #0F0617 100%)
        `,
        padding: `${theme.spacing.xxl} ${theme.spacing.xl}`,
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Auth chip — initial only, no "Account" label */}
      {user && (
        <div style={{ position: 'absolute', top: theme.spacing.lg, right: theme.spacing.lg, zIndex: 2 }}>
          <a
            href="/account"
            title="Account"
            aria-label="Account"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '50%',
              background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold})`,
              color: theme.colors.brandDark,
              fontFamily: theme.typography.fontSans,
              fontWeight: 700, fontSize: 14,
              textDecoration: 'none',
              boxShadow: `0 4px 14px ${theme.colors.brandDark}99`,
            }}
          >
            {initial}
          </a>
        </div>
      )}

      {/* Watercolor pigment pools — soft, blurred blobs that bleed like paint on wet paper */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-8%', left: '-10%', width: '60%', height: '55%',
          background: theme.colors.magenta, opacity: 0.28, filter: 'blur(70px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', top: '8%', right: '-12%', width: '55%', height: '50%',
          background: theme.colors.peach, opacity: 0.18, filter: 'blur(80px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-8%', width: '65%', height: '55%',
          background: theme.colors.tealDeep, opacity: 0.32, filter: 'blur(75px)', borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-5%', right: '-10%', width: '55%', height: '50%',
          background: theme.colors.berry, opacity: 0.35, filter: 'blur(70px)', borderRadius: '50%',
        }} />
      </div>

      {/* Paper grain texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.05,
        backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px), radial-gradient(circle at 45% 65%, #fff 0.5px, transparent 1px)',
        backgroundSize: '40px 40px, 60px 60px, 25px 25px',
        mixBlendMode: 'overlay',
      }} />

      <div style={{ position: 'relative', textAlign: 'center', marginTop: theme.spacing.xxl }}>
        <Monogram />

        <h1
          style={{
            fontFamily: theme.typography.fontLogo,
            fontSize: '56px',
            fontWeight: 300,
            color: theme.colors.cream,
            letterSpacing: '0.04em',
            marginTop: theme.spacing.xl,
            lineHeight: 1,
          }}
        >
          Wine Flight
        </h1>

        <div style={{ marginTop: theme.spacing.md }}>
          <BrassDivider />
        </div>

        <p
          style={{
            fontFamily: theme.typography.fontDisplay,
            fontSize: '18px',
            color: theme.colors.parchment,
            fontStyle: 'italic',
            marginTop: theme.spacing.md,
            letterSpacing: '0.04em',
            opacity: 0.9,
          }}
        >
          Uncork the world of wine
        </p>
      </div>

      {/* Bottom CTAs */}
      {user ? (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <button
            onClick={() => navigate('scanPrompt')}
            style={{
              width: '100%', padding: '18px',
              background: `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`,
              color: theme.colors.brandDark,
              border: 'none', borderRadius: theme.radius.sm,
              fontSize: '15px', fontWeight: 600,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              boxShadow: theme.shadows.brass,
            }}
          >
            {hasProfile ? 'Find more wines I’ll love' : 'Scan a wine list, shelf or bottle'}
          </button>

          {hasProfile ? (
            <>
              <TasteProfileCard tasteProfile={tasteProfile} onTap={() => navigate('profile')} />
              <button
                onClick={() => navigate('quizIntro')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: `${theme.colors.cream}cc`,
                  fontSize: 12,
                  fontFamily: theme.typography.fontSans,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  alignSelf: 'center',
                  padding: 4,
                }}
              >
                Update my taste profile
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('quizIntro')}
              style={{
                width: '100%', padding: '17px',
                backgroundColor: 'transparent',
                color: theme.colors.cream,
                border: `1px solid ${theme.colors.gold}80`,
                borderRadius: theme.radius.sm,
                fontSize: '15px', fontWeight: 500,
                fontFamily: theme.typography.fontSans,
                cursor: 'pointer',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              Build my taste profile
            </button>
          )}

          {hasProfile && recentScans.length > 0 && (
            <RecentScansStrip scans={recentScans} onOpen={onOpenScan} />
          )}
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.sm }}>
          <button
            onClick={handleGoogle}
            disabled={busy}
            style={{
              width: '100%', padding: '16px',
              background: theme.colors.cream,
              color: theme.colors.text,
              border: 'none', borderRadius: theme.radius.sm,
              fontFamily: theme.typography.fontSans,
              fontSize: 14, fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
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
              color: theme.colors.cream,
              border: `1px solid ${theme.colors.gold}80`,
              borderRadius: theme.radius.sm,
              fontSize: 14, fontWeight: 500,
              fontFamily: theme.typography.fontSans,
              cursor: busy ? 'wait' : 'pointer',
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >
            Sign in with email
          </button>

          {error && (
            <div style={{
              color: '#E8B4B4', fontFamily: theme.typography.fontSans,
              fontSize: 12, textAlign: 'center', marginTop: 4,
            }}>{error}</div>
          )}

          <div style={{
            marginTop: theme.spacing.md,
            display: 'flex', justifyContent: 'center', gap: 18,
            fontFamily: theme.typography.fontSans,
            fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            <a href="/privacy" style={{ color: theme.colors.gold, textDecoration: 'none', opacity: 0.8 }}>Privacy</a>
            <a href="/terms" style={{ color: theme.colors.gold, textDecoration: 'none', opacity: 0.8 }}>Terms</a>
          </div>

          <p style={{
            marginTop: 4, textAlign: 'center', maxWidth: 280,
            fontFamily: theme.typography.fontSans,
            fontSize: 11, color: `${theme.colors.parchment}80`, lineHeight: 1.5,
          }}>
            By continuing you confirm you&rsquo;re of legal drinking age and agree to our Terms.
          </p>
        </div>
      )}
    </div>
  )
}
