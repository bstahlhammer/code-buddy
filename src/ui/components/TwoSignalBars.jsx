/**
 * TwoSignalBars
 * ─────────────
 * Renders the two-signal quality display on wine cards:
 *   • Taste Fit  — how well the wine matches the user's palate (0-100)
 *   • Wine Quality — honest catalog quality score (0-100)
 *
 * Each bar is colored green / amber / red based on its tier.
 * An optional "Closest Available" pill is shown when confidenceLevel === 'closest'.
 */

import { theme } from '../theme/theme.js'

// ─── Tier colours ─────────────────────────────────────────────────────────────

function barColor(score, threshold) {
  if (score >= threshold)      return theme.colors.tide       // green-teal: confident
  if (score >= threshold * 0.8) return theme.colors.peach     // amber/peach: close
  return theme.colors.crimson                                  // red-berry: poor
}

function labelColor(score, threshold) {
  if (score >= threshold)       return theme.colors.tideDeep
  if (score >= threshold * 0.8) return theme.colors.peachDeep
  return theme.colors.crimson
}

// ─── Single bar ───────────────────────────────────────────────────────────────

function SignalBar({ label, score, threshold, descriptor }) {
  const fill  = barColor(score, threshold)
  const color = labelColor(score, threshold)

  return (
    <div style={{ flex: 1 }}>
      {/* Label row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 4,
      }}>
        <span style={{
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        <span style={{
          fontSize: theme.typography.sizes.xs,
          color,
          fontFamily: theme.typography.fontSans,
          fontWeight: 600,
        }}>
          {descriptor}
        </span>
      </div>

      {/* Bar track */}
      <div style={{
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.barTrack,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${Math.max(2, score)}%`,
          backgroundColor: fill,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  )
}

// ─── Descriptor helpers ───────────────────────────────────────────────────────

function tasteFitDescriptor(score, threshold) {
  if (score >= threshold)       return 'Strong fit'
  if (score >= threshold * 0.8) return 'Decent fit'
  if (score >= threshold * 0.6) return 'Partial fit'
  return 'Poor fit'
}

function qualityDescriptor(score) {
  if (score === 50) return 'Unknown'
  if (score >= 94) return 'Extraordinary'
  if (score >= 88) return 'Outstanding'
  if (score >= 84) return 'Highly rated'
  if (score >= 74) return 'Solid everyday wine'
  if (score >= 60) return 'Decent, not a standout'
  if (score >= 45) return 'Below average'
  return 'Poor quality'
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * @param {number}  tasteFit            0-100 palate match score
 * @param {number}  qualityScore        0-100 honest catalog quality (50 = unknown)
 * @param {string}  confidenceLevel     'confident' | 'closest' | 'stretch'
 * @param {number}  [tasteFitThreshold] default 82
 * @param {number}  [qualityThreshold]  default 85
 */
export default function TwoSignalBars({
  tasteFit,
  qualityScore,
  confidenceLevel,
  tasteFitThreshold = 82,
  qualityThreshold  = 85,
}) {
  const qualityIsUnknown = qualityScore === 50

  return (
    <div style={{ marginTop: theme.spacing.sm }}>
      {/* "Closest Available" pill */}
      {confidenceLevel === 'closest' && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          backgroundColor: `${theme.colors.peach}25`,
          border: `1px solid ${theme.colors.peach}70`,
          borderRadius: theme.radius.pill,
          padding: '2px 8px',
          marginBottom: theme.spacing.sm,
        }}>
          <span style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.peachDeep,
            fontFamily: theme.typography.fontSans,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            Closest Available
          </span>
        </div>
      )}

      {/* Two bars side by side */}
      <div style={{ display: 'flex', gap: theme.spacing.md }}>
        <SignalBar
          label="Taste Fit"
          score={tasteFit}
          threshold={tasteFitThreshold}
          descriptor={tasteFitDescriptor(tasteFit, tasteFitThreshold)}
        />
        <SignalBar
          label="Wine Quality"
          score={qualityIsUnknown ? 0 : qualityScore}
          threshold={qualityThreshold}
          descriptor={qualityIsUnknown ? 'Unknown' : qualityDescriptor(qualityScore)}
        />
      </div>
    </div>
  )
}
