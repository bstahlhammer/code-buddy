import { theme } from '../theme/theme.js'
import Badge from './Badge.jsx'
import MatchScore from './MatchScore.jsx'
import TwoSignalBars from './TwoSignalBars.jsx'
import { explainMatch, getConfidenceLevel, qualityLabel } from '@/core/api'

export default function WineCard({ wine, personalized, isBestMatch, tasteProfile, onTap, onNotOnList,
  tasteFitThreshold = 82, qualityThreshold = 85 }) {
  const matchScore       = wine.computedMatch ?? wine.match ?? 50
  const qualityScore     = wine.qualityScore ?? 50
  const confidenceLevel  = personalized
    ? getConfidenceLevel(matchScore, qualityScore, tasteFitThreshold, qualityThreshold)
    : null
  const isImperfect      = personalized && confidenceLevel === 'stretch'
  const matchExplanation = personalized && tasteProfile ? explainMatch(wine, tasteProfile) : null

  return (
    <button
      onClick={() => onTap?.(wine)}
      style={{
        width: '100%',
        backgroundColor: theme.colors.surface,
        backgroundImage: isBestMatch
          ? `linear-gradient(180deg, ${theme.colors.surface} 0%, ${theme.colors.surfaceAlt} 100%)`
          : 'none',
        border: isBestMatch
          ? `1px solid ${theme.colors.gold}`
          : `1px solid ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.lg,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: isBestMatch ? theme.shadows.brass : theme.shadows.card,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = theme.shadows.elevated }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = isBestMatch ? theme.shadows.brass : theme.shadows.card }}
    >
      {/* Best match overline */}
      {isBestMatch && (
        <div style={{ fontSize: '10px', color: theme.colors.gold, fontFamily: theme.typography.fontSans, fontWeight: 600, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 2 }}>
          ✦ Your Best Match ✦
        </div>
      )}

      {/* Row 1: Name + match score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 500, color: theme.colors.text, fontFamily: theme.typography.fontDisplay, lineHeight: 1.2, letterSpacing: '0.005em' }}>
            {wine.name}
          </div>
          {(() => {
            const priceStr = wine.price && wine.price !== ',' && String(wine.price).trim() !== ''
              ? (String(wine.price).startsWith('$') ? wine.price : `$${wine.price}`)
              : null
            const meta = [wine.vintage, wine.region, wine.grape, priceStr]
              .filter(v => v && String(v).trim() !== '')
            return meta.length > 0 ? (
              <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginTop: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {meta.join(' · ')}
              </div>
            ) : null
          })()}
        </div>
        {personalized && <MatchScore score={matchScore} explanation={matchExplanation} />}
      </div>

      {/* Row 2: Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
        {wine.rating > 0 && wine.ratingLabel && (
          <Badge variant="critic" label={`${wine.rating} · ${wine.ratingLabel}`} />
        )}
        {wine.isCrowd && <Badge variant="crowd" label="Crowd Pleaser" />}
        {wine.isValue && <Badge variant="value" label="Best Value" />}
        {typeof wine.confidence === 'number' && wine.confidence < 70 && (
          <Badge variant="critic" label={`Low confidence · ${wine.confidence}%`} />
        )}
      </div>

      {/* Why it's a match (personalized only) */}
      {personalized && wine.why && (
        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, lineHeight: 1.5 }}>
          {wine.why}
        </div>
      )}

      {/* Tasting note preview (anon only) */}
      {!personalized && wine.tasting && (
        <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, lineHeight: 1.5 }}>
          {wine.tasting.slice(0, 80)}{wine.tasting.length > 80 ? '…' : ''}
        </div>
      )}

      {/* Quality label (anon, catalog-matched wines only) */}
      {!personalized && wine.catalogConfidence === 'catalog' && (
        <div style={{ fontSize: 11, color: theme.colors.brand, fontFamily: theme.typography.fontSans, fontWeight: 500 }}>
          {qualityLabel(wine.qualityScore)}
        </div>
      )}

      {/* Two-signal bars (personalized only) */}
      {personalized && (
        <TwoSignalBars
          tasteFit={matchScore}
          qualityScore={qualityScore}
          confidenceLevel={confidenceLevel}
          tasteFitThreshold={tasteFitThreshold}
          qualityThreshold={qualityThreshold}
        />
      )}

      {/* Stretch match callout */}
      {isImperfect && (
        <div style={{
          marginTop: theme.spacing.xs,
          padding: '8px 10px',
          backgroundColor: `${theme.colors.peach}18`,
          border: `1px solid ${theme.colors.peach}50`,
          borderRadius: theme.radius.sm,
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.peachDeep,
          fontFamily: theme.typography.fontSans,
          lineHeight: 1.4,
        }}>
          {matchScore < 30
            ? 'Quite different from your usual style'
            : 'Outside your typical preference zone'}
        </div>
      )}

      {/* False-positive flag */}
      {onNotOnList && (
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onNotOnList(wine) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onNotOnList(wine) } }}
          style={{
            marginTop: theme.spacing.xs,
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.textMuted,
            fontFamily: theme.typography.fontSans,
            textAlign: 'right',
            cursor: 'pointer',
            textDecoration: 'underline',
            letterSpacing: '0.03em',
          }}
        >
          Not on the list
        </div>
      )}
    </button>
  )
}
