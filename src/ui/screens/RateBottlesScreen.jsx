import { useState } from 'react'
import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'
import WineRatingStep from '../components/WineRatingStep.jsx'

/**
 * Standalone "rate the bottles I know" path. Wraps WineRatingStep with a
 * header and Continue/Skip footer. Calls `onComplete({ wineRatings })`.
 */
export default function RateBottlesScreen({ navigate, goBack, initialRatings = {}, initialAiPalate = null, onComplete }) {
  const [ratings, setRatings] = useState(initialRatings)
  const [aiPalate, setAiPalate] = useState(initialAiPalate)
  const ratedCount = Object.keys(ratings).length
  const hasSignal = ratedCount > 0 || !!aiPalate

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <TopBar onBack={goBack} onHome={() => navigate('home')} />

      {/* Header */}
      <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.md}` }}>
        <div style={{
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.gold,
          fontFamily: theme.typography.fontSans,
          fontWeight: theme.typography.weights.medium,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: theme.spacing.sm,
        }}>
          Rate bottles you know
        </div>
        <h2 style={{
          fontFamily: theme.typography.fontSerif,
          fontSize: theme.typography.sizes.xxl,
          color: theme.colors.text,
          fontWeight: theme.typography.weights.normal,
          lineHeight: 1.2,
          marginBottom: theme.spacing.sm,
        }}>
          Tell us what you've loved (or hated)
        </h2>
        <p style={{
          fontSize: theme.typography.sizes.md,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,

          lineHeight: 1.5,
        }}>
          Search any bottle by maker, grape, or region. Your palate updates live as you rate.
        </p>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${theme.spacing.lg}` }}>
        <WineRatingStep
          value={ratings}
          onChange={setRatings}
          aiPalate={aiPalate}
          onAiPalateChange={setAiPalate}
        />
      </div>

      <div style={{
        flexShrink: 0,
        padding: theme.spacing.lg,
        borderTop: `0.5px solid ${theme.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
      }}>
        <button
          onClick={() => onComplete({ wineRatings: ratings, aiPalate })}
          disabled={!hasSignal}
          style={{
            width: '100%',
            padding: '16px',
            background: hasSignal
              ? `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`
              : theme.colors.border,
            color: hasSignal ? theme.colors.brandDark : theme.colors.textMuted,
            border: 'none',
            borderRadius: theme.radius.sm,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: theme.typography.fontSans,
            cursor: hasSignal ? 'pointer' : 'not-allowed',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: hasSignal ? theme.shadows.brass : 'none',
          }}
        >
          {!hasSignal
            ? 'Rate or describe at least one wine'
            : ratedCount > 0
              ? `See my taste profile (${ratedCount} rated${aiPalate ? ' + AI' : ''})`
              : 'See my taste profile (AI describe)'}
        </button>
        <button
          onClick={() => navigate('guidedQuiz')}
          style={{
            background: 'none',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fontSans,
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            padding: theme.spacing.xs,
          }}
        >
          I don't know any. Guide me with questions instead
        </button>
      </div>
    </div>
  )
}
