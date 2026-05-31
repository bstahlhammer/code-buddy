import { useMemo, useState, useCallback } from 'react'
import { theme } from '../theme/theme.js'
import { chooseHeroPicks, sortWines, applyFilters, getFilterFacets, EMPTY_FILTERS } from '@/core/api'
import HeroPickCard from '../components/HeroPickCard.jsx'
import WineCard from '../components/WineCard.jsx'
import UpsellBanner from '../components/UpsellBanner.jsx'
import BottomNav from '../components/BottomNav.jsx'
import TopBar from '../components/TopBar.jsx'
import FilterBar from '../components/FilterBar.jsx'
import FilterSheet from '../components/FilterSheet.jsx'
import { useScanFeedback } from '../hooks/useScanFeedback.js'

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

export default function AnonResultsScreen({ navigate, goBack, onWineSelect, tasteProfile, scannedWines, scanIntent, buyingFor, scanId }) {
  const hasProfile = !!tasteProfile
  const [showAll, setShowAll] = useState(false)
  const [sortKey, setSortKey] = useState('crowd')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)

  const { reportFeedback } = useScanFeedback()
  const handleNotOnList = useCallback((wine) => {
    reportFeedback({ scanId, wineName: wine.name, wineId: wine.id, reason: 'not_on_list' })
  }, [scanId, reportFeedback])

  const scanResult = normalizeScanResult(scannedWines)
  const scanAttempted = scanResult !== null
  const allWines = scanResult?.wines ?? []
  const readability = scanResult?.readability ?? 'good'
  const retakeReasons = scanResult?.retakeReasons ?? []
  const scanMessage = scanResult?.message
    || 'I could not identify a specific wine from that image. Try a closer, sharper photo where the full bottle label, shelf tag, or wine-list line is readable.'

  const facets = useMemo(() => getFilterFacets(allWines), [allWines])
  const wines = useMemo(() => applyFilters(allWines, filters), [allWines, filters])

  const lowConfidenceCount = useMemo(
    () => allWines.filter(w => typeof w.confidence === 'number' && w.confidence < 60).length,
    [allWines]
  )
  const showLowConfidenceWarning = scanAttempted && allWines.length > 0 &&
    lowConfidenceCount / allWines.length >= 0.3

  const heroPicks = useMemo(() => chooseHeroPicks(wines, hasProfile ? tasteProfile : null), [wines, tasteProfile, hasProfile])
  const heroIds = useMemo(() => new Set(heroPicks.map(p => p.wine.id ?? p.wine.name)), [heroPicks])

  const sortOptions = useMemo(() => [
    { value: 'match',  label: 'Best for me',    highlight: !hasProfile },
    { value: 'value',  label: 'Best value'  },
    { value: 'rating', label: 'Highest rated' },
    { value: 'crowd',  label: 'Crowd picks'  },
  ], [hasProfile])

  const handleSortChange = (next) => {
    if (next === 'match' && !hasProfile) {
      navigate('quizIntro')
      return
    }
    setSortKey(next)
  }

  const sortedRest = useMemo(() => {
    const rest = wines.filter(w => !heroIds.has(w.id ?? w.name))
    return sortWines(rest, sortKey, hasProfile ? tasteProfile : null)
  }, [wines, heroIds, sortKey, tasteProfile, hasProfile])

  const showRetakePanel = scanAttempted && readability !== 'good'
  const noWines = scanAttempted && allWines.length === 0
  const filteredEmpty = scanAttempted && allWines.length > 0 && wines.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface, position: 'relative' }}>
      {/* Header */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.md}` }}>
          <h1 style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xxl, color: theme.colors.cream, fontWeight: theme.typography.weights.normal }}>
            {noWines ? 'No wine identified' : heroPicks.length > 0 ? 'Your three picks' : 'Wine list results'}
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginTop: 4 }}>
            {noWines
              ? 'Take another photo to get a reliable result'
              : `${wines.length}${wines.length !== allWines.length ? ` of ${allWines.length}` : ''} wine${allWines.length === 1 ? '' : 's'} identified · Tap any to explore`}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Filter + sort bar */}
        {allWines.length > 0 && (
          <FilterBar
            sortKey={sortKey}
            onSortChange={handleSortChange}
            sortOptions={sortOptions}
            filters={filters}
            onOpen={() => setFilterOpen(true)}
            onChange={setFilters}
            facets={facets}
            resultCount={wines.length}
            totalCount={allWines.length}
          />
        )}

        {/* Empty filtered set */}
        {filteredEmpty && (
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

        {/* Retake guidance — shown when readability is partial OR fully unreadable */}
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
                {noWines ? 'No reliable read' : 'Partial read'}
              </div>
              <p style={{
                fontFamily: theme.typography.fontDisplay,
                fontSize: theme.typography.sizes.md,
                color: theme.colors.text,
                lineHeight: 1.4,
                marginBottom: theme.spacing.sm,
              }}>
                {noWines
                  ? scanMessage
                  : 'I read part of the list, but the rest was hard to see. A second photo will give you better picks.'}
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

        {/* Hero picks */}
        {heroPicks.length > 0 && (
          <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} 0`, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {heroPicks.map(({ role, wine, reasoning }) => (
              <HeroPickCard
                key={`${role}-${wine.id ?? wine.name}`}
                role={role}
                wine={wine}
                reasoning={reasoning}
                ctaLabel={role === 'topPick' && !hasProfile ? "Help me find wines I'll love" : undefined}
                onCta={role === 'topPick' && !hasProfile ? () => navigate('quizIntro') : undefined}
                onTap={onWineSelect}
                onNotOnList={handleNotOnList}
              />
            ))}
          </div>
        )}

        {/* Upsell + collapsible full list */}
        {wines.length > 0 && (
          <>
            {!tasteProfile && <UpsellBanner onCta={() => navigate('quizIntro')} />}

            {sortedRest.length > 0 && (
              <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}` }}>
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
                  <span>{showAll ? 'Hide' : 'See'} all {wines.length} wines</span>
                  <span style={{ fontSize: '14px' }}>{showAll ? '▲' : '▼'}</span>
                </button>

                {showAll && (
                  <div style={{ marginTop: theme.spacing.md, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
                    {sortedRest.map(wine => (
                      <WineCard
                        key={wine.id ?? wine.name}
                        wine={wine}
                        personalized={false}
                        onTap={onWineSelect}
                        onNotOnList={handleNotOnList}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Pure no-wines case (no hero picks, no retake panel above-the-fold list) */}
        {noWines && !showRetakePanel && (
          <div style={{ padding: theme.spacing.lg }}>
            <p style={{ fontFamily: theme.typography.fontSans, color: theme.colors.textMuted }}>
              {scanMessage}
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
        totalWines={allWines.length}
      />

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
