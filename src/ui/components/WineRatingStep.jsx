import { useMemo, useState } from 'react'
import { theme } from '../theme/theme.js'
import {
  getWineSearchIndex,
  getRatingBuckets,
  inferPalateFromRatings,
  nearestTasteProfile,
  describePalateFromText,
} from '@/core/api'

/**
 * 5-bucket wine rating step.
 *
 * `value` is a map { [wineId]: bucketId }. As the user rates wines, the
 * palate profile is inferred live and previewed below the rating list.
 *
 * Optional `aiPalate` (from the free-text describe step) is blended into
 * the live preview so the description shapes the profile too.
 */
export default function WineRatingStep({ value = {}, onChange, aiPalate = null, onAiPalateChange }) {
  const [query, setQuery] = useState('')

  const buckets = getRatingBuckets()
  const searchIndex = getWineSearchIndex()

  const wineById = useMemo(
    () => Object.fromEntries(searchIndex.map(w => [w.id, w])),
    [searchIndex]
  )

  const results = query.length >= 1
    ? searchIndex.filter(w => {
        if (value[w.id]) return false // hide already-rated
        const q = query.toLowerCase()
        return (
          w.name.toLowerCase().includes(q) ||
          w.grape.toLowerCase().includes(q) ||
          w.region.toLowerCase().includes(q)
        )
      }).slice(0, 8)
    : []

  const ratedEntries = Object.entries(value)
    .map(([id, bucketId]) => ({ wine: wineById[Number(id)], bucketId }))
    .filter(e => e.wine)

  const ratingsInference = useMemo(() => inferPalateFromRatings(value), [value])
  const inference = useMemo(
    () => blendWithAi(ratingsInference, aiPalate),
    [ratingsInference, aiPalate]
  )
  const archetype = useMemo(
    () => (inference.ratedCount > 0 || aiPalate ? nearestTasteProfile(inference.palate) : null),
    [inference, aiPalate]
  )

  function setRating(wineId, bucketId) {
    onChange({ ...value, [wineId]: bucketId })
    setQuery('')
  }

  function changeRating(wineId, bucketId) {
    onChange({ ...value, [wineId]: bucketId })
  }

  function removeRating(wineId) {
    const next = { ...value }
    delete next[wineId]
    onChange(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
      <DescribeStep aiPalate={aiPalate} onAiPalateChange={onAiPalateChange} />

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.colors.textMuted, fontSize: 16 }}>
          🔍
        </span>
        <input
          type="text"
          placeholder="Search by maker, grape, vintage, or region…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 36px',
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radius.md,
            fontSize: theme.typography.sizes.md,
            fontFamily: theme.typography.fontSans,
            color: theme.colors.text,
            outline: 'none',
            backgroundColor: theme.colors.surface,
          }}
        />
      </div>

      {/* Search results: tap a wine then choose a bucket */}
      {results.length > 0 && (
        <div style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.md,
          overflow: 'hidden',
          boxShadow: theme.shadows.elevated,
          backgroundColor: theme.colors.surface,
        }}>
          {results.map((wine, i) => (
            <SearchResultRow
              key={wine.id}
              wine={wine}
              first={i === 0}
              buckets={buckets}
              onPick={(bucketId) => setRating(wine.id, bucketId)}
            />
          ))}
        </div>
      )}

      {/* Rated wine list */}
      {ratedEntries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <SectionLabel>Your ratings</SectionLabel>
          {ratedEntries.map(({ wine, bucketId }) => (
            <RatedWineRow
              key={wine.id}
              wine={wine}
              bucketId={bucketId}
              buckets={buckets}
              onChange={(b) => changeRating(wine.id, b)}
              onRemove={() => removeRating(wine.id)}
            />
          ))}
        </div>
      )}

      {/* Live profile preview */}
      <PalatePreview inference={inference} archetype={archetype} hasAiSignal={!!aiPalate} />

      {ratedEntries.length === 0 && query.length === 0 && (
        <p style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,

          textAlign: 'center',
          margin: 0,
        }}>
          Search any wine you've tried — even just one helps shape your palate.
        </p>
      )}
    </div>
  )
}

// ─── Subcomponents ────────────────────────────────────────────────────────

function SearchResultRow({ wine, first, buckets, onPick }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ borderTop: first ? 'none' : `0.5px solid ${theme.colors.border}` }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text, fontFamily: theme.typography.fontSans }}>
          {wine.name} <span style={{ color: theme.colors.textMuted }}>{wine.vintage}</span>
        </span>
        <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
          {wine.grape} · {wine.region}
        </span>
      </button>

      {expanded && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          padding: `0 ${theme.spacing.md} ${theme.spacing.md}`,
        }}>
          {buckets.map(b => (
            <button
              key={b.id}
              onClick={() => onPick(b.id)}
              style={bucketButtonStyle(b, false)}
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function RatedWineRow({ wine, bucketId, buckets, onChange, onRemove }) {
  return (
    <div style={{
      backgroundColor: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: theme.typography.sizes.md, color: theme.colors.text, fontFamily: theme.typography.fontSans, fontWeight: theme.typography.weights.medium }}>
            {wine.name} <span style={{ color: theme.colors.textMuted, fontWeight: theme.typography.weights.normal }}>{wine.vintage}</span>
          </div>
          <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
            {wine.grape} · {wine.region}
          </div>
        </div>
        <button
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            color: theme.colors.textMuted,
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 4,
          }}
          aria-label="Remove rating"
        >
          ×
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {buckets.map(b => (
          <button
            key={b.id}
            onClick={() => onChange(b.id)}
            style={bucketButtonStyle(b, b.id === bucketId)}
          >
            <span>{b.emoji}</span>
            <span>{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PalatePreview({ inference, archetype, hasAiSignal }) {
  const { palate, ratedCount, confidence } = inference
  const hasSignal = ratedCount > 0 || hasAiSignal

  return (
    <div style={{
      backgroundColor: theme.colors.brand,
      borderRadius: theme.radius.md,
      padding: theme.spacing.lg,
      color: theme.colors.textOnDark,
      boxShadow: theme.shadows.brass,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: theme.spacing.md }}>
        <span style={{
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.goldBright,
          fontFamily: theme.typography.fontSans,
          fontWeight: theme.typography.weights.medium,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Live palate
        </span>
        <span style={{
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.textOnDark,
          opacity: 0.7,
          fontFamily: theme.typography.fontSans,
        }}>
          {hasSignal ? `${Math.round(confidence * 100)}% confidence` : 'no signal yet'}
        </span>
      </div>

      <div style={{
        fontFamily: theme.typography.fontSerif,
        fontSize: theme.typography.sizes.xl,

        marginBottom: theme.spacing.md,
        color: theme.colors.cream,
      }}>
        {hasSignal ? archetype.name : 'Awaiting your first signal'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
        <AxisBar label="Body"      value={palate.body} />
        <AxisBar label="Tannin"    value={palate.tannin} />
        <AxisBar label="Sweetness" value={palate.sweetness} />
        <AxisBar label="Acidity"   value={palate.acidity} />
      </div>
    </div>
  )
}

function AxisBar({ label, value }) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
      <span style={{
        width: 70,
        fontSize: theme.typography.sizes.xs,
        fontFamily: theme.typography.fontSans,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: theme.colors.goldBright,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(232, 222, 200, 0.18)',
        borderRadius: theme.radius.pill,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${safe}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${theme.colors.gold}, ${theme.colors.goldBright})`,
          transition: 'width 0.4s cubic-bezier(.2,.8,.2,1)',
        }} />
      </div>
      <span style={{
        width: 28,
        textAlign: 'right',
        fontSize: theme.typography.sizes.xs,
        fontFamily: theme.typography.fontSans,
        color: theme.colors.textOnDark,
        opacity: 0.8,
      }}>
        {safe}
      </span>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.gold,
      fontFamily: theme.typography.fontSans,
      fontWeight: theme.typography.weights.medium,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    }}>
      {children}
    </div>
  )
}

// ─── Styling helpers ──────────────────────────────────────────────────────

function bucketButtonStyle(bucket, selected) {
  const isPositive = bucket.weight > 0
  const isNegative = bucket.weight < 0
  const accent = isPositive ? theme.colors.success : isNegative ? '#A32D2D' : theme.colors.textMuted

  return {
    padding: '6px 10px',
    borderRadius: theme.radius.pill,
    border: `1px solid ${selected ? accent : theme.colors.border}`,
    backgroundColor: selected ? `${accent}18` : theme.colors.surface,
    color: selected ? accent : theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontSans,
    fontWeight: selected ? theme.typography.weights.medium : theme.typography.weights.normal,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    transition: 'all 0.15s ease',
  }
}

// ─── AI describe step ─────────────────────────────────────────────────────

function DescribeStep({ aiPalate, onAiPalateChange }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  // `staged` holds the AI's last response BEFORE the user confirms it.
  // Once confirmed we propagate the palate up via onAiPalateChange and
  // collapse the editor into a compact summary card. Re-opening lets the
  // user refine — taste evolves over time.
  const [staged, setStaged] = useState(null)   // { palate, coachingNote, vocabulary, confidence }
  const [confirmed, setConfirmed] = useState(null) // same shape, locked-in
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)

  // If parent clears aiPalate externally, reset confirmed state.
  // (Intentional simple guard, not a full sync.)

  async function submit() {
    if (text.trim().length < 3 || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await describePalateFromText(text.trim())
      if (res.error) {
        setError(res.coachingNote || 'Something went wrong.')
        setStaged(null)
      } else {
        setStaged({
          palate: res.palate,
          coachingNote: res.coachingNote,
          vocabulary: res.vocabulary,
          confidence: res.confidence,
        })
      }
    } catch (e) {
      setError('Could not reach the AI. Try again in a moment.')
    } finally {
      setLoading(false)
    }
  }

  function confirm() {
    if (!staged) return
    setConfirmed(staged)
    onAiPalateChange?.(staged.palate)
    setEditing(false)
    setStaged(null)
  }

  function refine() {
    // Keep staged result visible; user edits the textarea and re-submits.
    // Do not clear text — they may want to tweak it.
    setStaged(null)
  }

  function reopen() {
    setEditing(true)
    setText('')
    setStaged(null)
  }

  function clearAll() {
    setText('')
    setStaged(null)
    setConfirmed(null)
    setEditing(false)
    setError(null)
    onAiPalateChange?.(null)
  }

  const canSubmit = text.trim().length >= 3 && !loading

  // ── Compact confirmed summary (collapsed state) ──────────────────
  if (confirmed && !editing) {
    return (
      <div style={{
        border: `1px solid ${theme.colors.gold}60`,
        borderRadius: theme.radius.md,
        padding: theme.spacing.md,
        backgroundColor: `${theme.colors.gold}10`,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xs,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
          <div style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.gold,
            fontFamily: theme.typography.fontSans,
            fontWeight: theme.typography.weights.medium,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            ✨ Your description · locked in
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
            <button onClick={reopen} style={textLinkStyle()}>Refine</button>
            <button onClick={clearAll} style={textLinkStyle()}>Clear</button>
          </div>
        </div>
        <div style={{
          fontFamily: theme.typography.fontSerif,

          fontSize: theme.typography.sizes.md,
          color: theme.colors.text,
          lineHeight: 1.4,
        }}>
          “{confirmed.coachingNote}”
        </div>
        {confirmed.vocabulary?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {confirmed.vocabulary.map((v, i) => (
              <span key={i} style={vocabChipStyle()}>{v}</span>
            ))}
          </div>
        )}
        <p style={{
          margin: 0,
          marginTop: theme.spacing.xs,
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,

        }}>
          Rate any specific bottles below to sharpen your profile further — your taste can evolve over time.
        </p>
      </div>
    )
  }

  // ── Open editor (initial or refining) ──────────────────────────────
  return (
    <div style={{
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      display: 'flex',
      flexDirection: 'column',
      gap: theme.spacing.sm,
    }}>
      <div style={{
        fontSize: theme.typography.sizes.xs,
        color: theme.colors.gold,
        fontFamily: theme.typography.fontSans,
        fontWeight: theme.typography.weights.medium,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        ✨ {editing ? 'Refine your description' : 'Describe wines you love'}
      </div>
      <p style={{
        margin: 0,
        fontSize: theme.typography.sizes.sm,
        color: theme.colors.textMuted,
        fontFamily: theme.typography.fontSans,

        lineHeight: 1.4,
      }}>
        Don't know the names? Describe what you like in your own words, "smooth reds, nothing too dry", and we'll translate it into your taste profile.
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, 500))}
        placeholder="e.g. I love jammy reds that aren't too tannic, and crisp dry whites with citrus…"
        rows={3}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radius.sm,
          fontSize: theme.typography.sizes.md,
          fontFamily: theme.typography.fontSans,
          color: theme.colors.text,
          outline: 'none',
          resize: 'vertical',
          backgroundColor: theme.colors.surface,
          opacity: loading ? 0.6 : 1,
        }}
      />
      <div style={{ display: 'flex', gap: theme.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={submit}
          disabled={!canSubmit}
          style={{
            padding: '8px 14px',
            border: 'none',
            borderRadius: theme.radius.sm,
            background: canSubmit
              ? `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`
              : theme.colors.border,
            color: canSubmit ? theme.colors.brandDark : theme.colors.textMuted,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fontSans,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            boxShadow: canSubmit ? theme.shadows.brass : 'none',
          }}
        >
          {loading ? 'Reading…' : staged ? 'Re-analyze' : 'Translate to palate'}
        </button>
        {editing && (
          <button onClick={() => { setEditing(false); setStaged(null); setError(null) }} style={textLinkStyle()}>
            Cancel
          </button>
        )}
        {(staged || aiPalate) && !editing && (
          <button onClick={clearAll} style={textLinkStyle()}>
            Clear
          </button>
        )}
      </div>

      {error && (
        <div style={{
          fontSize: theme.typography.sizes.sm,
          color: '#A32D2D',
          fontFamily: theme.typography.fontSans,
        }}>
          {error}
        </div>
      )}

      {staged && !error && (
        <div style={{
          marginTop: theme.spacing.xs,
          padding: theme.spacing.sm,
          backgroundColor: `${theme.colors.gold}12`,
          border: `1px solid ${theme.colors.gold}40`,
          borderRadius: theme.radius.sm,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.gold,
            fontFamily: theme.typography.fontSans,
            fontWeight: theme.typography.weights.medium,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            Here's what we heard
          </div>
          <div style={{
            fontFamily: theme.typography.fontSerif,

            fontSize: theme.typography.sizes.md,
            color: theme.colors.text,
            lineHeight: 1.4,
          }}>
            “{staged.coachingNote}”
          </div>
          {staged.vocabulary?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
              {staged.vocabulary.map((v, i) => (
                <span key={i} style={vocabChipStyle()}>{v}</span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: theme.spacing.sm, marginTop: theme.spacing.xs, flexWrap: 'wrap' }}>
            <button
              onClick={confirm}
              style={{
                padding: '8px 14px',
                border: 'none',
                borderRadius: theme.radius.sm,
                background: `linear-gradient(180deg, ${theme.colors.goldBright} 0%, ${theme.colors.gold} 100%)`,
                color: theme.colors.brandDark,
                fontSize: theme.typography.sizes.sm,
                fontFamily: theme.typography.fontSans,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: theme.shadows.brass,
              }}
            >
              ✓ That's me
            </button>
            <button onClick={refine} style={refineButtonStyle()}>
              Not quite — let me rephrase
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function textLinkStyle() {
  return {
    background: 'none',
    border: 'none',
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontSans,
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    padding: 0,
  }
}

function refineButtonStyle() {
  return {
    padding: '8px 14px',
    border: `1px solid ${theme.colors.gold}80`,
    borderRadius: theme.radius.sm,
    background: 'transparent',
    color: theme.colors.text,
    fontSize: theme.typography.sizes.sm,
    fontFamily: theme.typography.fontSans,
    fontWeight: 500,
    cursor: 'pointer',
  }
}

function vocabChipStyle() {
  return {
    fontSize: theme.typography.sizes.xs,
    padding: '3px 8px',
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.brand,
    color: theme.colors.cream,
    fontFamily: theme.typography.fontSans,
    letterSpacing: '0.04em',
  }
}

// ─── Inference blending ───────────────────────────────────────────────────

/**
 * Blend rating-derived inference with an optional AI-derived palate.
 * AI counts as one strong signal: it nudges the centroid and boosts
 * confidence, but rated bottles still dominate when present.
 */
function blendWithAi(ratingsInference, aiPalate) {
  if (!aiPalate) return ratingsInference
  const ratingsWeight = ratingsInference.ratedCount
  const aiWeight = 1.5
  const total = ratingsWeight + aiWeight || 1
  const safeAi = (k) => Number.isFinite(aiPalate?.[k]) ? aiPalate[k] : ratingsInference.palate[k]
  const blend = (k) => Math.round(
    (ratingsInference.palate[k] * ratingsWeight + safeAi(k) * aiWeight) / total
  )
  const palate = {
    body:      blend('body'),
    tannin:    blend('tannin'),
    sweetness: blend('sweetness'),
    acidity:   blend('acidity'),
  }
  const confidence = Math.min(1, ratingsInference.confidence + 0.25)
  return {
    palate,
    confidence,
    ratedCount: ratingsInference.ratedCount,
    bucketCounts: ratingsInference.bucketCounts,
  }
}
