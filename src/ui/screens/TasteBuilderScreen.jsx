import { useMemo, useState } from 'react'
import { theme } from '../theme/theme.js'
import {
  getTasteProfiles,
  inferPalateFromRatings,
  nearestTasteProfile,
} from '@/core/api'
import TopBar from '../components/TopBar.jsx'
import WineRatingStep from '../components/WineRatingStep.jsx'
import ArchetypePicker from '../components/ArchetypePicker.jsx'

/**
 * Unified "Build your taste profile" screen.
 *
 * Three optional, stackable signals — all blend into the same palate:
 *   1. Describe + Rate bottles (via WineRatingStep, which also includes the
 *      AI describe step at the top).
 *   2. Pick a taste archetype (visual cards as a fast bootstrap).
 *
 * A live profile preview at the bottom shows the user's current archetype
 * as soon as ANY signal is present. Single CTA — "See my profile" — unlocks
 * the moment there's signal. A "Refine with more questions" link routes to
 * the older guided question tree for users who want it.
 */
export default function TasteBuilderScreen({
  navigate,
  goBack,
  initialRatings = {},
  initialAiPalate = null,
  initialArchetypeSeed = null,
  onComplete,
}) {
  const [ratings, setRatings]           = useState(initialRatings)
  const [aiPalate, setAiPalate]         = useState(initialAiPalate)
  const [archetypeSeed, setArchetypeSeed] = useState(initialArchetypeSeed)
  // Section open/closed state — start with describe+rate open, others closed.
  const [openSection, setOpenSection] = useState('rate')

  const ratedCount = Object.keys(ratings).length

  // Live blended preview: same logic as deriveProfile, simplified.
  const preview = useMemo(() => {
    const inferredR = inferPalateFromRatings(ratings)
    const sources = []
    if (inferredR.palate) sources.push({ palate: inferredR.palate, weight: inferredR.confidence })
    if (aiPalate) sources.push({ palate: aiPalate, weight: 1.5 })
    if (archetypeSeed) {
      const seed = getTasteProfiles().find(p => p.id === archetypeSeed)
      if (seed) sources.push({ palate: seed.palate, weight: 0.8 })
    }
    if (sources.length === 0) return null
    const total = sources.reduce((s, x) => s + x.weight, 0)
    const palate = { body: 0, sweetness: 0, tannin: 0, acidity: 0 }
    for (const { palate: p, weight: w } of sources) {
      palate.body      += p.body      * w
      palate.sweetness += p.sweetness * w
      palate.tannin    += p.tannin    * w
      palate.acidity   += p.acidity   * w
    }
    palate.body      = Math.round(palate.body      / total)
    palate.sweetness = Math.round(palate.sweetness / total)
    palate.tannin    = Math.round(palate.tannin    / total)
    palate.acidity   = Math.round(palate.acidity   / total)
    return { palate, archetype: nearestTasteProfile(palate) }
  }, [ratings, aiPalate, archetypeSeed])

  const hasSignal = !!preview

  function handleComplete() {
    onComplete({
      wineRatings: ratings,
      aiPalate,
      archetypeSeed,
    })
  }

  // Section status badge text
  const rateStatus = ratedCount > 0 || aiPalate
    ? `${aiPalate ? 'Description ✓' : ''}${aiPalate && ratedCount ? ' · ' : ''}${ratedCount ? `${ratedCount} rated` : ''}`
    : null
  const archetypeStatus = archetypeSeed
    ? getTasteProfiles().find(p => p.id === archetypeSeed)?.name
    : null

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <TopBar onBack={goBack} onHome={() => navigate('home')} />

      {/* Header */}
      <div style={{ flexShrink: 0, padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.md}` }}>
        <div style={{
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.gold,
          fontFamily: theme.typography.fontSans,
          fontWeight: theme.typography.weights.medium,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: theme.spacing.sm,
        }}>
          Build your taste profile
        </div>
        <h2 style={{
          fontFamily: theme.typography.fontSerif,
          fontSize: theme.typography.sizes.xxl,
          color: theme.colors.text,
          fontWeight: theme.typography.weights.normal,
          fontStyle: 'italic',
          lineHeight: 1.2,
          marginBottom: theme.spacing.sm,
        }}>
          Three ways in. Use any, or all.
        </h2>
        <p style={{
          fontSize: theme.typography.sizes.md,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,
          lineHeight: 1.5,
          margin: 0,
        }}>
          Each signal sharpens your profile. You can always come back and refine.
        </p>
      </div>

      {/* Sections */}
      <div className="hide-scrollbar" style={{
        flex: '1 1 0',
        minHeight: 0,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}`,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.md,
      }}>
        <Section
          number="1"
          title="Describe & rate"
          subtitle="Words you'd use, or specific bottles you've loved."
          status={rateStatus}
          open={openSection === 'rate'}
          onToggle={() => setOpenSection(openSection === 'rate' ? null : 'rate')}
        >
          <WineRatingStep
            value={ratings}
            onChange={setRatings}
            aiPalate={aiPalate}
            onAiPalateChange={setAiPalate}
          />
        </Section>

        <Section
          number="2"
          title="Pick an archetype"
          subtitle="Tap the one that sounds most like you. It's a starting point, not a label."
          status={archetypeStatus}
          open={openSection === 'archetype'}
          onToggle={() => setOpenSection(openSection === 'archetype' ? null : 'archetype')}
        >
          <ArchetypePicker value={archetypeSeed} onChange={setArchetypeSeed} />
        </Section>

        {/* Live profile preview */}
        <ProfilePreview preview={preview} />

        {/* Refine link */}
        <div style={{ textAlign: 'center', marginTop: theme.spacing.sm }}>
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
            Want more questions? Refine with a guided Q&A
          </button>
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        flexShrink: 0,
        padding: theme.spacing.lg,
        borderTop: `0.5px solid ${theme.colors.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.sm,
      }}>
        <button
          onClick={handleComplete}
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
            transition: 'all 0.15s ease',
          }}
        >
          {hasSignal ? 'See my taste profile' : 'Add at least one signal above'}
        </button>
        {!hasSignal && (
          <button
            onClick={() => navigate('home')}
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
            Skip for now
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────

function Section({ number, title, subtitle, status, open, onToggle, children }) {
  return (
    <div style={{
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: theme.spacing.md,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          gap: theme.spacing.md,
          alignItems: 'center',
        }}
      >
        <div style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `1px solid ${theme.colors.gold}`,
          backgroundColor: status ? theme.colors.gold : theme.colors.surface,
          color: status ? theme.colors.brandDark : theme.colors.gold,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: theme.typography.fontSerif,
          fontStyle: 'italic',
          fontSize: 14,
          flexShrink: 0,
          fontWeight: 600,
        }}>
          {status ? '✓' : number}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: theme.typography.fontSerif,
            fontStyle: 'italic',
            fontSize: theme.typography.sizes.lg,
            color: theme.colors.text,
            lineHeight: 1.2,
          }}>
            {title}
          </div>
          <div style={{
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizes.sm,
            color: theme.colors.textMuted,
            lineHeight: 1.4,
            marginTop: 2,
          }}>
            {status || subtitle}
          </div>
        </div>
        <div style={{
          color: theme.colors.textMuted,
          fontSize: 14,
          flexShrink: 0,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
        }}>
          ▾
        </div>
      </button>
      {open && (
        <div style={{
          padding: `0 ${theme.spacing.md} ${theme.spacing.md}`,
          borderTop: `0.5px solid ${theme.colors.border}`,
        }}>
          <div style={{ paddingTop: theme.spacing.md }}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Live profile preview ─────────────────────────────────────────────────

function ProfilePreview({ preview }) {
  if (!preview) {
    return (
      <div style={{
        padding: theme.spacing.md,
        border: `1px dashed ${theme.colors.border}`,
        borderRadius: theme.radius.md,
        textAlign: 'center',
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textMuted,
        fontFamily: theme.typography.fontSans,
        fontStyle: 'italic',
      }}>
        Your profile will appear here as you go.
      </div>
    )
  }
  const { palate, archetype } = preview
  return (
    <div style={{
      padding: theme.spacing.md,
      border: `1px solid ${theme.colors.gold}60`,
      borderRadius: theme.radius.md,
      backgroundColor: `${theme.colors.gold}10`,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
    }}>
      <div style={{
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.gold,
        fontFamily: theme.typography.fontSans,
        fontWeight: theme.typography.weights.medium,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}>
        ✦ Your profile so far
      </div>
      <div style={{
        fontFamily: theme.typography.fontSerif,
        fontStyle: 'italic',
        fontSize: theme.typography.sizes.xl,
        color: theme.colors.text,
        lineHeight: 1.2,
      }}>
        {archetype.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
        <Bar label="Body"      value={palate.body} />
        <Bar label="Tannin"    value={palate.tannin} />
        <Bar label="Acidity"   value={palate.acidity} />
        <Bar label="Sweetness" value={palate.sweetness} />
      </div>
    </div>
  )
}

function Bar({ label, value }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
      <div style={{
        width: 64,
        fontSize: '10px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: theme.colors.textMuted,
        fontFamily: theme.typography.fontSans,
        fontWeight: theme.typography.weights.medium,
      }}>
        {label}
      </div>
      <div style={{
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.barTrack,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${safe}%`,
          background: `linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright})`,
          transition: 'width 0.3s ease',
        }}/>
      </div>
      <div style={{
        width: 28,
        textAlign: 'right',
        fontSize: '11px',
        color: theme.colors.textMuted,
        fontFamily: theme.typography.fontSans,
      }}>
        {safe}
      </div>
    </div>
  )
}
