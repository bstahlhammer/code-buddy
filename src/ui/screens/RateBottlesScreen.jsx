import { useState } from 'react'
import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'
import WineRatingStep from '../components/WineRatingStep.jsx'

/**
 * Standalone "rate the bottles I know" path. Wraps WineRatingStep with a
 * header and Continue/Skip footer. Calls `onComplete({ wineRatings })`.
 */
export default function RateBottlesScreen({ navigate, goBack, initialRatings = {}, onComplete }) {
  const [ratings, setRatings] = useState(initialRatings)
  const ratedCount = Object.keys(ratings).length

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.surface }}>
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
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}>
          Search any bottle by maker, grape, or region. Your palate updates live as you rate.
        </p>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: `0 ${theme.spacing.lg}` }}>
        <WineRatingStep value={ratings} onChange={setRatings} />
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
          onClick={() => onComplete({ wineRatings: ratings })}
          disabled={ratedCount === 0}
          style={{
            width: '100%',
            padding: '16px',
            background: ratedCount > 0
              ? `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`
              : theme.colors.border,
            color: ratedCount > 0 ? theme.colors.brandDark : theme.colors.textMuted,
            border: 'none',
            borderRadius: theme.radius.sm,
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: theme.typography.fontSans,
            cursor: ratedCount > 0 ? 'pointer' : 'not-allowed',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: ratedCount > 0 ? theme.shadows.brass : 'none',
          }}
        >
          {ratedCount === 0 ? 'Rate at least one wine' : `See my taste profile (${ratedCount} rated)`}
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
          I don't know any — guide me with questions instead
        </button>
      </div>
    </div>
  )
}
