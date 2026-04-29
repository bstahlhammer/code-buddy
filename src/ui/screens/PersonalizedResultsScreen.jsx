import { useMemo, useState } from 'react'
import { theme } from '../theme/theme.js'
import { getWines, sortWines, chooseHeroPicks, computeMatch, explainMatch } from '@/core/api'
import HeroPickCard from '../components/HeroPickCard.jsx'
import WineCard from '../components/WineCard.jsx'
import SortToggle from '../components/SortToggle.jsx'
import BottomNav from '../components/BottomNav.jsx'
import TopBar from '../components/TopBar.jsx'

const SORT_OPTIONS = [
  { value: 'match',          label: 'My Match' },
  { value: 'crowd',          label: 'Crowd Pleasers' },
  { value: 'value',          label: 'Value for Money' },
  { value: 'approachability', label: 'For group' },
]

const REASON_COPY = {
  too_blurry:       'The image was a little blurry — try holding steadier.',
  too_dark:         'It was too dark — move toward better light.',
  too_far:          'You were too far away — get closer so the labels fill the frame.',
  glare:            'There was glare on the labels — change angle or shade the page.',
  angle_skewed:     'The angle was skewed — square the camera to the list or bottle.',
  label_cut_off:    'Part of the label was cut off — re-frame to include the full label.',
  not_a_wine_image: 'I could not find any wine text in this image.',
  list_too_dense:   'The list was too dense to read at once — try one section.',
}

function normalizeScanResult(scannedWines) {
  if (!scannedWines) return null
  if (Array.isArray(scannedWines)) {
    return { wines: scannedWines, readability: 'good', retakeReasons: [], message: '' }
  }
  if (typeof scannedWines === 'object') {
    return {
      wines: Array.isArray(scannedWines.wines) ? scannedWines.wines : [],
      readability: scannedWines.readability || (scannedWines.wines?.length ? 'partial' : 'unreadable'),
      retakeReasons: Array.isArray(scannedWines.retakeReasons) ? scannedWines.retakeReasons : [],
      message: typeof scannedWines.message === 'string' ? scannedWines.message : '',
    }
  }
  return null
}

export default function PersonalizedResultsScreen({ navigate, goBack, tasteProfile, buyingFor, scannedWines, onWineSelect }) {
  const defaultSort = buyingFor === 'group' ? 'approachability' : 'match'
  const [sortKey, setSortKey] = useState(defaultSort)
  const [showAll, setShowAll] = useState(false)

  // If we came from a scan, use those wines; otherwise fall back to the catalogue.
  const scanResult = normalizeScanResult(scannedWines)
  const fromScan = scanResult !== null && scanResult.wines.length > 0
  const baseWines = fromScan ? scanResult.wines : getWines()
  const readability = scanResult?.readability ?? 'good'
  const retakeReasons = scanResult?.retakeReasons ?? []

  const heroPicks = useMemo(
    () => chooseHeroPicks(baseWines, tasteProfile),
    [baseWines, tasteProfile]
  )
  const heroIds = useMemo(
    () => new Set(heroPicks.map(p => p.wine.id ?? p.wine.name)),
    [heroPicks]
  )

  const sortedRest = useMemo(() => {
    const rest = baseWines.filter(w => !heroIds.has(w.id ?? w.name))
    return sortWines(rest, sortKey, tasteProfile)
  }, [baseWines, heroIds, sortKey, tasteProfile])

  const showRetakePanel = fromScan && readability !== 'good'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.md}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.sm }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xxl, color: theme.colors.cream, fontWeight: theme.typography.weights.normal }}>
                {fromScan ? 'Your three picks' : 'Your matches'}
              </h1>
              <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginTop: 4 }}>
                {fromScan
                  ? `${baseWines.length} wine${baseWines.length === 1 ? '' : 's'} identified · matched to your taste`
                  : `${baseWines.length} wines · Tap any to explore`}
              </p>
            </div>
            {/* Identity chip */}
            {tasteProfile && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: `${theme.colors.gold}25`,
                  border: `1px solid ${theme.colors.gold}50`,
                  borderRadius: theme.radius.pill,
                  padding: '4px 10px',
                  maxWidth: 160,
                  flexShrink: 0,
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: theme.colors.gold, flexShrink: 0 }} />
                <span style={{ fontSize: theme.typography.sizes.xs, color: theme.colors.gold, fontFamily: theme.typography.fontSans, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tasteProfile.name?.replace(/^The\s+/i, '')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Retake guidance — when scan was partial */}
        {showRetakePanel && (
          <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} 0` }}>
            <div style={{
              border: `1px solid ${theme.colors.gold}50`,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surfaceAlt,
              padding: theme.spacing.lg,
              boxShadow: theme.shadows.card,
            }}>
              <div style={{
                fontSize: '10px',
                color: theme.colors.gold,
                fontFamily: theme.typography.fontSans,
                fontWeight: 600,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                marginBottom: theme.spacing.sm,
              }}>
                Partial read
              </div>
              <p style={{
                fontFamily: theme.typography.fontDisplay,
                fontSize: theme.typography.sizes.md,
                color: theme.colors.text,
                lineHeight: 1.4,
                marginBottom: theme.spacing.sm,
              }}>
                I read part of the list, but the rest was hard to see. A second photo will give you better matches.
              </p>
              {retakeReasons.length > 0 && (
                <ul style={{
                  fontFamily: theme.typography.fontSans,
                  color: theme.colors.textMuted,
                  fontSize: theme.typography.sizes.sm,
                  lineHeight: 1.6,
                  paddingLeft: theme.spacing.lg,
                  marginBottom: theme.spacing.md,
                }}>
                  {retakeReasons.slice(0, 3).map((r) => (
                    <li key={r}>{REASON_COPY[r] || r}</li>
                  ))}
                </ul>
              )}
              <button
                onClick={() => navigate('scanPrompt')}
                style={{
                  width: '100%',
                  border: 'none',
                  borderRadius: theme.radius.sm,
                  background: `linear-gradient(135deg, ${theme.colors.gold} 0%, ${theme.colors.goldBright} 100%)`,
                  color: theme.colors.brandDark,
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  fontFamily: theme.typography.fontSans,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Try another photo
              </button>
            </div>
          </div>
        )}

        {/* Hero picks with match scores */}
        {heroPicks.length > 0 && (
          <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} 0`, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {heroPicks.map(({ role, wine, reasoning }) => {
              const score = computeMatch(wine, tasteProfile)
              const explanation = explainMatch(wine, tasteProfile)
              return (
                <HeroPickCard
                  key={`${role}-${wine.id ?? wine.name}`}
                  role={role}
                  wine={wine}
                  reasoning={reasoning}
                  matchScore={score}
                  matchExplanation={explanation}
                  onTap={onWineSelect}
                />
              )
            })}
          </div>
        )}

        {/* Collapsible full list */}
        {sortedRest.length > 0 && (
          <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.lg}` }}>
            <button
              onClick={() => setShowAll(v => !v)}
              style={{
                width: '100%',
                background: 'transparent',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radius.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                color: theme.colors.text,
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.sm,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{showAll ? 'Hide' : 'See'} {fromScan ? `all ${baseWines.length} wines` : `all matches`}</span>
              <span style={{ fontSize: '14px' }}>{showAll ? '▲' : '▼'}</span>
            </button>

            {showAll && (
              <div style={{ marginTop: theme.spacing.md, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                <SortToggle options={SORT_OPTIONS} value={sortKey} onChange={setSortKey} />
                {sortedRest.map(wine => (
                  <WineCard
                    key={wine.id ?? wine.name}
                    wine={wine}
                    personalized
                    onTap={onWineSelect}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state when scan returned nothing */}
        {fromScan && baseWines.length === 0 && (
          <div style={{ padding: theme.spacing.lg }}>
            <p style={{ fontFamily: theme.typography.fontSans, color: theme.colors.textMuted }}>
              I couldn't pick a match from that scan. Try another photo with the labels in clearer view.
            </p>
          </div>
        )}
      </div>

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
