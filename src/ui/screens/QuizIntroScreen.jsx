import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'

function GlassIllustration() {
  return (
    <svg width="64" height="88" viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 8 L65 8 L52 42 Q40 56 40 72 L40 94" stroke={theme.colors.gold} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M52 42 Q40 56 28 42 L15 8" stroke={theme.colors.gold} strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4"/>
      <ellipse cx="40" cy="22" rx="14" ry="4" fill={theme.colors.brand} opacity="0.4"/>
      <line x1="28" y1="94" x2="52" y2="94" stroke={theme.colors.gold} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function PathCard({ icon, title, description, meta, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: theme.spacing.lg,
        backgroundColor: primary ? theme.colors.brand : theme.colors.surface,
        border: `1px solid ${primary ? theme.colors.gold : theme.colors.border}`,
        borderRadius: theme.radius.md,
        boxShadow: primary ? theme.shadows.brass : theme.shadows.card,
        cursor: 'pointer',
        display: 'flex',
        gap: theme.spacing.md,
        alignItems: 'flex-start',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: `1px solid ${primary ? theme.colors.gold : theme.colors.border}`,
          backgroundColor: primary ? theme.colors.brandDark : theme.colors.surfaceAlt,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div
          style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.xl,
            fontWeight: theme.typography.weights.normal,
            color: primary ? theme.colors.cream : theme.colors.text,
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizes.sm,
            color: primary ? `${theme.colors.cream}cc` : theme.colors.textMuted,
            lineHeight: 1.5,
          }}
        >
          {description}
        </div>
        {meta && (
          <div
            style={{
              fontFamily: theme.typography.fontSans,
              fontSize: '10px',
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: primary ? theme.colors.goldBright : theme.colors.gold,
              fontWeight: theme.typography.weights.medium,
              marginTop: 4,
            }}
          >
            {meta}
          </div>
        )}
      </div>
      <div
        style={{
          color: primary ? theme.colors.gold : theme.colors.textMuted,
          fontSize: 22,
          fontFamily: theme.typography.fontSerif,
          alignSelf: 'center',
        }}
      >
        ›
      </div>
    </button>
  )
}

export default function QuizIntroScreen({ navigate, goBack }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <TopBar onBack={goBack} onHome={() => navigate('home')} />
      <div
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: `${theme.spacing.lg} ${theme.spacing.xl} ${theme.spacing.xl}`,
          gap: theme.spacing.xl,
        }}
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.md }}>
          <GlassIllustration />
          <div>
            <h1
              style={{
                fontFamily: theme.typography.fontSerif,
                fontSize: theme.typography.sizes.xxl,
                fontWeight: theme.typography.weights.normal,
                color: theme.colors.text,
                marginBottom: theme.spacing.xs,
                fontStyle: 'italic',
              }}
            >
              Build your taste profile
            </h1>
            <p
              style={{
                fontSize: theme.typography.sizes.md,
                color: theme.colors.textMuted,
                fontFamily: theme.typography.fontSans,
                lineHeight: 1.5,
              }}
            >
              Pick whichever feels easier — both teach us your palate.
            </p>
          </div>
        </div>

        {/* Two paths */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          <PathCard
            icon="🍷"
            title="Rate bottles I know"
            description="Search wines you've had and rate them from loved to hated. Best if you can name a few."
            meta="≈ 60 sec"
            onClick={() => navigate('rateBottles')}
            primary
          />
          <PathCard
            icon="🧭"
            title="Guide me with questions"
            description="Plain-English questions about taste and flavor. No wine names required."
            meta="≈ 90 sec"
            onClick={() => navigate('guidedQuiz')}
          />
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('anonResults')}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.textMuted,
              fontSize: theme.typography.sizes.md,
              fontFamily: theme.typography.fontSans,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              padding: theme.spacing.sm,
            }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
