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

  const inference = useMemo(() => inferPalateFromRatings(value), [value])
  const archetype = useMemo(
    () => (inference.ratedCount > 0 ? nearestTasteProfile(inference.palate) : null),
    [inference]
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
      <PalatePreview inference={inference} archetype={archetype} />

      {ratedEntries.length === 0 && query.length === 0 && (
        <p style={{
          fontSize: theme.typography.sizes.sm,
          color: theme.colors.textMuted,
          fontFamily: theme.typography.fontSans,
          fontStyle: 'italic',
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

function PalatePreview({ inference, archetype }) {
  const { palate, ratedCount, confidence } = inference
  const hasSignal = ratedCount > 0

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
        fontStyle: 'italic',
        marginBottom: theme.spacing.md,
        color: theme.colors.cream,
      }}>
        {hasSignal ? archetype.name : 'Awaiting your first rating'}
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
          width: `${value}%`,
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
        {value}
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
