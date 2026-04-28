import { theme } from '../theme/theme.js'

function Monogram() {
  // Brass-line wine glass monogram inside a thin brass ring
  return (
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: '50%',
        border: `1px solid ${theme.colors.gold}`,
        boxShadow: `0 0 0 6px ${theme.colors.brandDark}, 0 0 0 7px ${theme.colors.gold}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      <svg width="40" height="52" viewBox="0 0 40 52" fill="none">
        <path
          d="M8 4 H32 L28 22 Q20 30 12 22 Z"
          stroke={theme.colors.goldBright}
          strokeWidth="1.2"
          fill="none"
          strokeLinejoin="round"
        />
        <line x1="20" y1="30" x2="20" y2="44" stroke={theme.colors.goldBright} strokeWidth="1.2" />
        <line x1="12" y1="44" x2="28" y2="44" stroke={theme.colors.goldBright} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
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

export default function HomeScreen({ navigate, auth }) {
  const user = auth?.user
  const profileName = auth?.profile?.display_name
  const initial = (profileName || user?.email || '?').trim()[0]?.toUpperCase() ?? '?'

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: `radial-gradient(ellipse at top, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 70%)`,
        padding: `${theme.spacing.xxl} ${theme.spacing.xl}`,
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Auth chip — top right */}
      <div style={{ position: 'absolute', top: theme.spacing.lg, right: theme.spacing.lg, zIndex: 2 }}>
        {user ? (
          <button
            onClick={() => auth.signOut()}
            title="Sign out"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${theme.colors.gold}55`,
              borderRadius: theme.radius.pill,
              padding: '4px 12px 4px 4px',
              color: theme.colors.cream,
              fontFamily: theme.typography.fontSans,
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            <span style={{
              width: 24, height: 24, borderRadius: '50%',
              background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold})`,
              color: theme.colors.brandDark,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 12,
            }}>{initial}</span>
            Sign out
          </button>
        ) : (
          <button
            onClick={() => navigate('auth')}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.colors.gold}80`,
              borderRadius: theme.radius.pill,
              padding: '6px 14px',
              color: theme.colors.gold,
              fontFamily: theme.typography.fontSans,
              fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        )}
      </div>

      {/* Subtle parchment texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.04,
        backgroundImage: 'radial-gradient(circle at 20% 30%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 80%, #fff 1px, transparent 1px)',
        backgroundSize: '40px 40px, 60px 60px',
      }} />

      <div style={{ position: 'relative', textAlign: 'center', marginTop: theme.spacing.xxl }}>
        <Monogram />

        <div style={{
          fontFamily: theme.typography.fontSans,
          fontSize: '10px',
          letterSpacing: '0.32em',
          color: theme.colors.gold,
          marginTop: theme.spacing.lg,
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>
          Est. Cellar
        </div>

        <h1
          style={{
            fontFamily: theme.typography.fontDisplay,
            fontSize: '64px',
            fontWeight: 500,
            color: theme.colors.cream,
            letterSpacing: '0.04em',
            marginTop: theme.spacing.sm,
            lineHeight: 1,
            fontStyle: 'italic',
          }}
        >
          MySom
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

      {/* CTAs */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
        <button
          onClick={() => navigate('scanPrompt')}
          style={{
            width: '100%',
            padding: '18px',
            background: `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`,
            color: theme.colors.brandDark,
            border: 'none',
            borderRadius: theme.radius.sm,
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            boxShadow: theme.shadows.brass,
          }}
        >
          Choose a wine now
        </button>

        <button
          onClick={() => navigate('quizIntro')}
          style={{
            width: '100%',
            padding: '17px',
            backgroundColor: 'transparent',
            color: theme.colors.cream,
            border: `1px solid ${theme.colors.gold}80`,
            borderRadius: theme.radius.sm,
            fontSize: '15px',
            fontWeight: 500,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Build my taste profile
        </button>

        <button
          onClick={() => navigate('scanPrompt')}
          style={{
            background: 'none',
            border: 'none',
            color: `${theme.colors.parchment}99`,
            fontSize: theme.typography.sizes.md,
            fontFamily: theme.typography.fontDisplay,
            fontStyle: 'italic',
            cursor: 'pointer',
            marginTop: theme.spacing.xs,
          }}
        >
          — just let me explore —
        </button>
      </div>
    </div>
  )
}
