import { useMemo, useState, useCallback } from 'react'
import { theme } from '../theme/theme.js'
import { getWines, sortWines, chooseHeroPicks, computeMatch, explainMatch, applyFilters, getFilterFacets, EMPTY_FILTERS, getConfidenceLevel } from '@/core/api'
import HeroPickCard from '../components/HeroPickCard.jsx'
import WineCard from '../components/WineCard.jsx'
import BottomNav from '../components/BottomNav.jsx'
import TopBar from '../components/TopBar.jsx'
import FilterBar from '../components/FilterBar.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import { useScanFeedback } from '../hooks/useScanFeedback.js'

const SORT_OPTIONS = [
  { value: 'match',           label: 'Best for me'   },
  { value: 'value',           label: 'Best value'    },
  { value: 'crowd',           label: 'Crowd picks'   },
  { value: 'approachability', label: 'For the group' },
]

const REASON_COPY = {
  too_blurry:       'The image was a little blurry, try holding steadier.',
  too_dark:         'It was too dark, move toward better light.',
  too_far:          'You were too far away, get closer so the labels fill the frame.',
  glare:            'There was glare on the labels, change angle or shade the page.',
  angle_skewed:     'The angle was skewed, square the camera to the list or bottle.',
  label_cut_off:    'Part of the label was cut off, re-frame to include the full label.',
  not_a_wine_image: 'I could not find any wine text in this image.',
  list_too_dense:   'The list was too dense to read at once, try one section.',
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

export default function PersonalizedResultsScreen({ navigate, goBack, tasteProfile, buyingFor, scanIntent, scannedWines, onWineSelect, scanId }) {
  // Always default to match-first when a profile exists.
  const [sortKey, setSortKey] = useState('match')
  const [showAll, setShowAll] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)

  const { reportFeedback } = useScanFeedback()
  const handleNotOnList = useCallback((wine) => {
    reportFeedback({ scanId, wineName: wine.name, wineId: wine.id, reason: 'not_on_list' })
  }, [scanId, reportFeedback])

  // If we came from a scan, use those wines; otherwise fall back to the catalogue.
  const scanResult = normalizeScanResult(scannedWines)
  const fromScan = scanResult !== null && scanResult.wines.length > 0
  const baseWines = fromScan ? scanResult.wines : getWines()
  const readability = scanResult?.readability ?? 'good'
  const retakeReasons = scanResult?.retakeReasons ?? []

  // Compute match score for every wine so we can detect "no strong matches"
  // and flag low-confidence reads.
  const scoredWines = useMemo(() => {
    if (!tasteProfile) return baseWines
    return baseWines.map(w => ({
      ...w,
      computedMatch: w.computedMatch ?? computeMatch(w, tasteProfile),
    }))
  }, [baseWines, tasteProfile])

  // Facets are computed from the full (unfiltered) scored set so the
  // user can always re-add a facet they just filtered away.
  const facets = useMemo(() => getFilterFacets(scoredWines), [scoredWines])

  // Apply user filters BEFORE hero-pick selection and sort.
  const filteredWines = useMemo(() => applyFilters(scoredWines, filters), [scoredWines, filters])

  const topMatch = useMemo(() => {
    if (!tasteProfile || filteredWines.length === 0) return 0
    return Math.max(...filteredWines.map(w => w.computedMatch ?? 0))
  }, [filteredWines, tasteProfile])

  // "No strong matches" is now a two-signal gate: taste fit AND quality must both
  // meet their thresholds for at least one wine to count as a confident pick.
  const tasteFitThreshold = tasteProfile?.tasteFitThreshold ?? 82
  const qualityThreshold  = tasteProfile?.qualityThreshold  ?? 85
  const hasConfidentPick = useMemo(() => {
    if (!tasteProfile || filteredWines.length === 0) return false
    return filteredWines.some(w => {
      const fit = w.computedMatch ?? computeMatch(w, tasteProfile)
      const quality = w.qualityScore ?? 50
      return getConfidenceLevel(fit, quality, tasteFitThreshold, qualityThreshold) === 'confident'
    })
  }, [filteredWines, tasteProfile, tasteFitThreshold, qualityThreshold])
  const noStrongMatches = tasteProfile && filteredWines.length > 0 && !hasConfidentPick

  const lowConfidenceCount = useMemo(
    () => filteredWines.filter(w => typeof w.confidence === 'number' && w.confidence < 60).length,
    [filteredWines]
  )
  const showLowConfidenceWarning = fromScan && filteredWines.length > 0 &&
    lowConfidenceCount / filteredWines.length >= 0.3

  const heroPicks = useMemo(
    () => chooseHeroPicks(filteredWines, tasteProfile),
    [filteredWines, tasteProfile]
  )
  const heroIds = useMemo(
    () => new Set(heroPicks.map(p => p.wine.id ?? p.wine.name)),
    [heroPicks]
  )

  const sortedRest = useMemo(() => {
    const rest = filteredWines.filter(w => !heroIds.has(w.id ?? w.name))
    return sortWines(rest, sortKey, tasteProfile)
  }, [filteredWines, heroIds, sortKey, tasteProfile])

  const showRetakePanel = fromScan && readability !== 'good'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface, position: 'relative' }}>
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
                  ? `${filteredWines.length}${filteredWines.length !== scoredWines.length ? ` of ${scoredWines.length}` : ''} wine${scoredWines.length === 1 ? '' : 's'} identified · sorted by Match Score`
                  : `${filteredWines.length} wines · Tap any to explore`}
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
        {/* Filter + sort bar */}
        {scoredWines.length > 0 && (
          <FilterBar
            sortKey={sortKey}
            onSortChange={setSortKey}
            sortOptions={SORT_OPTIONS}
            filters={filters}
            onOpen={() => setFilterOpen(true)}
            onChange={setFilters}
            facets={facets}
            resultCount={filteredWines.length}
            totalCount={scoredWines.length}
          />
        )}

        {/* Empty filtered set */}
        {scoredWines.length > 0 && filteredWines.length === 0 && (
          <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}` }}>
            <div style={{
              padding: theme.spacing.md, borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.border}`, background: theme.colors.surfaceAlt,
              fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm,
              color: theme.colors.text,
            }}>
              No wines match these filters. <button
                onClick={() => setFilters(EMPTY_FILTERS)}
                style={{ background: 'transparent', border: 'none', color: theme.colors.gold, fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >Clear filters</button> to see your full list.
            </div>
          </div>
        )}

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

        {/* No-strong-matches banner */}
        {noStrongMatches && !showRetakePanel && (
          <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} 0` }}>
            <div style={{
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              border: `1px solid ${theme.colors.peach}80`,
              background: `${theme.colors.peach}18`,
              fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text,
              lineHeight: 1.5,
            }}>
              <strong style={{ display: 'block', fontWeight: 700, fontSize: theme.typography.sizes.md, marginBottom: 4 }}>
                Honest take.
              </strong>
              None of these wines match your palate or quality standards. We wouldn't confidently order any of these for you.
            </div>
          </div>
        )}

        {/* Low-confidence read warning */}
        {showLowConfidenceWarning && (
          <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.lg} 0` }}>
            <div style={{
              padding: '10px 12px',
              borderRadius: theme.radius.sm,
              background: `${theme.colors.gold}1a`,
              border: `1px solid ${theme.colors.gold}55`,
              fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.sm,
              color: theme.colors.text,
            }}>
              Some labels were hard to read. Try a sharper photo for a more complete shortlist.
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
                  tasteFitThreshold={tasteFitThreshold}
                  qualityThreshold={qualityThreshold}
                  onTap={onWineSelect}
                  onNotOnList={handleNotOnList}
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
                marginTop: theme.spacing.sm,
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
                {sortedRest.map(wine => (
                  <WineCard
                    key={wine.id ?? wine.name}
                    wine={wine}
                    personalized
                    tasteProfile={tasteProfile}
                    tasteFitThreshold={tasteFitThreshold}
                    qualityThreshold={qualityThreshold}
                    onTap={onWineSelect}
                    onNotOnList={handleNotOnList}
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

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(next) => { setFilters(next); setFilterOpen(false) }}
        facets={facets}
        totalWines={scoredWines.length}
      />

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
