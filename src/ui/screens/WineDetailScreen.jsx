import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'
import Badge from '../components/Badge.jsx'
import ApproachabilityDots from '../components/ApproachabilityDots.jsx'
import MatchScore from '../components/MatchScore.jsx'
import FoodPairingChip from '../components/FoodPairingChip.jsx'
import ShelfSpotlight from '../components/ShelfSpotlight.jsx'
import TopBar from '../components/TopBar.jsx'
import {
  computeApproachability,
  computeMatch,
  explainMatch,
  explainMismatch,
  locateBottleInScan,
  qualityLabel,
} from '@/core/api'

const RATINGS = [
  { emoji: '❤️', label: 'Love it' },
  { emoji: '👍', label: 'Pretty good' },
  { emoji: '🤷', label: 'Not sure' },
  { emoji: '👎', label: 'Not for me' },
]

const RETAILER_LABELS = {
  costco:      'Costco',
  trader_joes: "Trader Joe's",
  whole_foods: 'Whole Foods',
  grocery:     'Grocery stores',
  restaurant:  'Restaurants',
  wine_shop:   'Wine shops',
}

const AXIS_INFO = [
  { key: 'body',      label: 'Body',      lo: 'Light',   hi: 'Full'   },
  { key: 'tannin',    label: 'Tannin',    lo: 'Soft',    hi: 'Grippy' },
  { key: 'acidity',   label: 'Acidity',   lo: 'Round',   hi: 'Crisp'  },
  { key: 'sweetness', label: 'Sweetness', lo: 'Bone dry', hi: 'Sweet' },
]

function descriptor(axis, value) {
  if (axis === 'body')      return value >= 75 ? 'Full' : value >= 50 ? 'Medium' : 'Light'
  if (axis === 'sweetness') return value >= 60 ? 'Sweet' : value >= 35 ? 'Off-dry' : value >= 15 ? 'Dry' : 'Bone dry'
  if (axis === 'tannin')    return value >= 75 ? 'High' : value >= 45 ? 'Medium' : 'Low'
  if (axis === 'acidity')   return value >= 65 ? 'High' : value >= 45 ? 'Medium' : 'Low'
  return ''
}

export default function WineDetailScreen({ goBack, navigate, wine, tasteProfile, activeScan, onRate }) {
  const [orderedNotif, setOrderedNotif] = useState(false)
  const [shelfOpen, setShelfOpen] = useState(false)
  const [bbox, setBbox] = useState(wine?.bbox || null)
  const [bboxLoading, setBboxLoading] = useState(false)
  const [bboxError, setBboxError] = useState(null)
  const [showHonest, setShowHonest] = useState(false)

  // Sync bbox when wine prop changes
  useEffect(() => {
    setBbox(wine?.bbox || null)
    setBboxError(null)
  }, [wine?.id, wine?.name])

  if (!wine) return null

  const approachability = computeApproachability(wine)
  const matchScore = tasteProfile
    ? (wine.computedMatch ?? computeMatch(wine, tasteProfile))
    : (wine.match ?? null)
  const isHighlyRated = wine.rating >= 90
  const matchExplain = tasteProfile ? explainMatch(wine, tasteProfile) : null
  const mismatch = tasteProfile ? explainMismatch(wine, tasteProfile) : null
  const hasShelfPhoto = !!activeScan?.photoUrl

  function handleOrdered() {
    setOrderedNotif(true)
    setTimeout(() => setOrderedNotif(false), 3000)
  }

  async function handleLocate() {
    if (!activeScan?.scanId || bboxLoading) return
    setBboxLoading(true)
    setBboxError(null)
    const { found, bbox: located, error } = await locateBottleInScan({
      scanId: activeScan.scanId,
      wineName: wine.name,
    })
    setBboxLoading(false)
    if (error) { setBboxError(error); return }
    if (found && located) setBbox(located)
    else setBboxError('not_found')
  }

  // Auto-locate on first open if we have a photo but no bbox yet
  useEffect(() => {
    if (shelfOpen && hasShelfPhoto && !bbox && !bboxLoading && !bboxError) {
      handleLocate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shelfOpen])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      {/* Top panel */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />

        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg} ${theme.spacing.xl}` }}>
          <h1
            style={{
              fontFamily: theme.typography.fontSerif,
              fontSize: theme.typography.sizes.xxl,
              fontWeight: theme.typography.weights.normal,
              color: theme.colors.cream,
              lineHeight: 1.2,
              marginBottom: theme.spacing.xs,
            }}
          >
            {wine.name}
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginBottom: wine.catalogConfidence === 'catalog' ? theme.spacing.xs : theme.spacing.md }}>
            {[wine.vintage, wine.region, wine.grape, wine.price].filter(Boolean).join(' · ')}
          </p>
          {wine.catalogConfidence === 'catalog' && (
            <span style={{
              display: 'inline-block',
              fontSize: 11, fontFamily: theme.typography.fontSans,
              color: theme.colors.brand, fontWeight: 500,
              background: `${theme.colors.brand}22`,
              borderRadius: 100, padding: '2px 10px',
              marginBottom: theme.spacing.md,
            }}>
              {qualityLabel(wine.qualityScore)}
            </span>
          )}

          <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
            {wine.rating > 0 && <Badge variant="critic" label={`${wine.rating}${wine.ratingLabel ? ' · ' + wine.ratingLabel : ''}`} />}
            {matchScore !== null && tasteProfile && <MatchScore score={matchScore} />}
            {wine.isCrowd && <Badge variant="crowd" label="Crowd Pleaser" />}
            {wine.isValue && <Badge variant="value" label="Best Value" />}
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.lg }}>

        {/* Match summary — hero block (only if signed-in profile exists) */}
        {tasteProfile && matchExplain && (
          <section style={{
            marginBottom: theme.spacing.xl,
            padding: theme.spacing.lg,
            background: `linear-gradient(135deg, ${theme.colors.brand}08, ${theme.colors.ember}10)`,
            border: `1px solid ${theme.colors.ember}33`,
            borderRadius: theme.radius.md,
          }}>
            <MicroLabel>Why this match</MicroLabel>
            <p style={{
              fontFamily: theme.typography.fontSerif,
              fontSize: theme.typography.sizes.lg,

              color: theme.colors.text,
              lineHeight: 1.4,
              margin: `${theme.spacing.xs} 0 ${theme.spacing.sm}`,
            }}>
              {matchExplain.headline}
            </p>
            {matchExplain.axes.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {matchExplain.axes.map((line, i) => (
                  <li key={i} style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.fontSans,
                    lineHeight: 1.5,
                  }}>
                    · {line}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Find on shelf — only if we have a scan photo */}
        {hasShelfPhoto && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
              <MicroLabel>Find it on the shelf</MicroLabel>
              <button
                onClick={() => setShelfOpen(o => !o)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.brand,
                  fontFamily: theme.typography.fontSans,
                  fontSize: 12,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {shelfOpen ? 'Hide' : 'Show'}
              </button>
            </div>
            {shelfOpen && (
              <ShelfSpotlight
                photoUrl={activeScan.photoUrl}
                bbox={bbox}
                loading={bboxLoading}
                error={bboxError}
                onRetry={handleLocate}
                label={wine.name}
              />
            )}
            {shelfOpen && bbox && !bboxLoading && (
              <p style={{ fontSize: 12, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginTop: 8, }}>
                Look for the highlighted bottle.
              </p>
            )}
          </section>
        )}

        {/* Tasting notes */}
        {wine.tasting && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <MicroLabel>Tasting notes</MicroLabel>
            <p style={{
              fontFamily: theme.typography.fontSerif,
              fontSize: theme.typography.sizes.lg,

              color: theme.colors.text,
              lineHeight: 1.5,
              marginTop: theme.spacing.xs,
            }}>
              {wine.tasting}
            </p>
          </section>
        )}

        {/* Style profile — axis comparison */}
        <section style={{ marginBottom: theme.spacing.xl }}>
          <MicroLabel>Style profile {tasteProfile && '· vs your palate'}</MicroLabel>
          <div style={{ marginTop: theme.spacing.md, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {AXIS_INFO.map(a => (
              <AxisRow
                key={a.key}
                label={a.label}
                lo={a.lo}
                hi={a.hi}
                wineValue={wine[a.key]}
                userValue={tasteProfile?.palate?.[a.key]}
                descriptor={descriptor(a.key, wine[a.key])}
              />
            ))}
          </div>
        </section>

        {/* Honest take / Why not this wine */}
        {tasteProfile && mismatch && mismatch.reasons.length > 0 && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <button
              onClick={() => setShowHonest(s => !s)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: theme.spacing.md,
                background: mismatch.severity === 'high' ? `${theme.colors.crimson}10` : `${theme.colors.brandDark}06`,
                border: `1px solid ${mismatch.severity === 'high' ? theme.colors.crimson + '40' : theme.colors.border}`,
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: theme.typography.fontSans,
              }}
            >
              <div>
                <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: mismatch.severity === 'high' ? theme.colors.crimson : theme.colors.textMuted, fontWeight: 500 }}>
                  Honest take
                </div>
                <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text, marginTop: 4, lineHeight: 1.4 }}>
                  {mismatch.headline}
                </div>
              </div>
              <span style={{ fontSize: 18, color: theme.colors.textMuted, marginLeft: 12 }}>
                {showHonest ? '−' : '+'}
              </span>
            </button>
            {showHonest && (
              <ul style={{
                listStyle: 'none',
                padding: theme.spacing.md,
                margin: `${theme.spacing.xs} 0 0`,
                background: '#fff',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.md,
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {mismatch.reasons.map((r, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink: 0,
                      width: 6, height: 6,
                      borderRadius: '50%',
                      marginTop: 7,
                      background: r.severity === 'high' ? theme.colors.crimson
                                : r.severity === 'medium' ? theme.colors.ember
                                : theme.colors.gold,
                    }} />
                    <div>
                      <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, fontWeight: 500 }}>
                        {r.axis}
                      </div>
                      <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.text, fontFamily: theme.typography.fontSans, lineHeight: 1.5, marginTop: 2 }}>
                        {r.text}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Approachability */}
        <section style={{ marginBottom: theme.spacing.xl }}>
          <MicroLabel>Approachability</MicroLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
            <ApproachabilityDots score={approachability} />
            <span style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
              {approachability >= 5 ? 'Anyone will love it' :
               approachability >= 4 ? 'Broadly approachable' :
               approachability >= 3 ? 'Wine-curious crowd' :
               approachability >= 2 ? 'For wine lovers' :
               'For bold palates only'}
            </span>
          </div>
        </section>

        {/* Food pairings */}
        {wine.pairings?.length > 0 && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <MicroLabel>Food pairings</MicroLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
              {wine.pairings.map(p => <FoodPairingChip key={p} pairing={p} />)}
            </div>
          </section>
        )}

        {/* Where to find it */}
        {wine.retailers && wine.retailers.length > 0 && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <MicroLabel>Where to find it</MicroLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
              {wine.retailers.map(r => (
                <span key={r} style={{
                  padding: '5px 12px',
                  backgroundColor: theme.colors.barTrack,
                  borderRadius: theme.radius.pill,
                  fontSize: theme.typography.sizes.sm,
                  color: theme.colors.text,
                  fontFamily: theme.typography.fontSans,
                }}>
                  {RETAILER_LABELS[r] ?? r}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Order online CTA */}
        {isHighlyRated && (
          <section style={{ marginBottom: theme.spacing.xl }}>
            <button style={{
              width: '100%',
              padding: '14px',
              backgroundColor: theme.colors.brand,
              color: theme.colors.cream,
              border: 'none',
              borderRadius: theme.radius.md,
              fontSize: theme.typography.sizes.md,
              fontFamily: theme.typography.fontSans,
              fontWeight: theme.typography.weights.medium,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              <span>🛒</span>
              <span>Order online</span>
            </button>
          </section>
        )}
      </div>

      {/* Sticky footer — rate */}
      <div style={{
        flexShrink: 0,
        borderTop: `0.5px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.surface,
        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
      }}>
        <button
          onClick={handleOrdered}
          style={{
            width: '100%',
            padding: '10px',
            marginBottom: theme.spacing.sm,
            backgroundColor: orderedNotif ? `${theme.colors.gold}20` : 'transparent',
            border: `0.5px solid ${orderedNotif ? theme.colors.gold : theme.colors.border}`,
            borderRadius: theme.radius.sm,
            fontSize: theme.typography.sizes.sm,
            fontFamily: theme.typography.fontSans,
            color: orderedNotif ? theme.colors.gold : theme.colors.textMuted,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {orderedNotif ? (
            <><span>🔔</span><span>Got it! We'll remind you to rate this wine.</span></>
          ) : (
            <><span>🍾</span><span>I ordered this wine</span></>
          )}
        </button>

        <p style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, textAlign: 'center', marginBottom: theme.spacing.sm }}>
          What did you think of this wine?
        </p>
        <div style={{ display: 'flex', gap: theme.spacing.xs }}>
          {RATINGS.map(r => (
            <button
              key={r.label}
              onClick={() => onRate(r.label)}
              style={{
                flex: 1,
                padding: '8px 4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                backgroundColor: 'transparent',
                border: `0.5px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                cursor: 'pointer',
                fontSize: 18,
              }}
            >
              <span>{r.emoji}</span>
              <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans }}>
                {r.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function MicroLabel({ children }) {
  return (
    <div style={{
      fontSize: 11,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: theme.colors.ember,
      fontFamily: theme.typography.fontSans,
      fontWeight: 500,
    }}>
      {children}
    </div>
  )
}

/**
 * AxisRow — single track showing the wine's value, with the user's value
 * marked as a small triangle below if a profile exists.
 */
function AxisRow({ label, lo, hi, wineValue, userValue, descriptor }) {
  const wPct = clamp(wineValue)
  const uPct = typeof userValue === 'number' ? clamp(userValue) : null
  const delta = uPct !== null ? Math.abs(wPct - uPct) : 0
  const aligned = uPct !== null && delta < 12
  const off = uPct !== null && delta >= 28

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm, color: theme.colors.text, fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontFamily: theme.typography.fontSans, fontSize: 12, color: theme.colors.textMuted }}>
          {descriptor}
        </span>
      </div>
      <div style={{
        position: 'relative',
        height: 6,
        background: theme.colors.barTrack,
        borderRadius: 3,
        overflow: 'visible',
      }}>
        {/* Wine fill */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          width: `${wPct}%`,
          background: `linear-gradient(90deg, ${theme.colors.ember}, ${theme.colors.emberBright})`,
          borderRadius: 3,
        }} />
        {/* Wine marker */}
        <div style={{
          position: 'absolute',
          left: `${wPct}%`,
          top: -3,
          width: 12, height: 12,
          marginLeft: -6,
          borderRadius: '50%',
          background: theme.colors.emberBright,
          border: `2px solid ${theme.colors.cream}`,
          boxShadow: `0 0 0 1px ${theme.colors.ember}55`,
        }} title={`This wine: ${wPct}`} />
        {/* User palate marker (triangle below) */}
        {uPct !== null && (
          <div
            title={`Your palate: ${uPct}`}
            style={{
              position: 'absolute',
              left: `${uPct}%`,
              top: 10,
              width: 0, height: 0,
              marginLeft: -5,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: `7px solid ${aligned ? theme.colors.brand : off ? theme.colors.crimson : theme.colors.tide}`,
            }}
          />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: uPct !== null ? 12 : 4 }}>
        <span style={{ fontFamily: theme.typography.fontSans, fontSize: 10, color: theme.colors.textMuted, letterSpacing: '0.04em' }}>{lo}</span>
        <span style={{ fontFamily: theme.typography.fontSans, fontSize: 10, color: theme.colors.textMuted, letterSpacing: '0.04em' }}>{hi}</span>
      </div>
      {uPct !== null && (
        <div style={{ fontSize: 10, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginTop: 2, }}>
          {aligned ? '◆ aligns with your palate' : off ? '◆ notably different from your palate' : '◆ small difference from your palate'}
        </div>
      )}
    </div>
  )
}

function clamp(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(100, v))
}
