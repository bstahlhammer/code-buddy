import { useMemo, useState } from 'react'
import { theme } from '../theme/theme.js'
import { chooseHeroPicks, sortWines, applyFilters, getFilterFacets, EMPTY_FILTERS } from '@/core/api'
import HeroPickCard from '../components/HeroPickCard.jsx'
import WineCard from '../components/WineCard.jsx'
import SortToggle from '../components/SortToggle.jsx'
import UpsellBanner from '../components/UpsellBanner.jsx'
import BottomNav from '../components/BottomNav.jsx'
import TopBar from '../components/TopBar.jsx'
import FilterBar from '../components/FilterBar.jsx'
import FilterSheet from '../components/FilterSheet.jsx'

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

export default function AnonResultsScreen({ navigate, goBack, onWineSelect, tasteProfile, scannedWines, scanIntent, buyingFor }) {
  const hasProfile = !!tasteProfile
  const [showAll, setShowAll] = useState(false)
  const [sortKey, setSortKey] = useState('crowd')

  const scanResult = normalizeScanResult(scannedWines)
  const scanAttempted = scanResult !== null
  const wines = scanResult?.wines ?? []
  const readability = scanResult?.readability ?? 'good'
  const retakeReasons = scanResult?.retakeReasons ?? []
  const scanMessage = scanResult?.message
    || 'I could not identify a specific wine from that image. Try a closer, sharper photo where the full bottle label, shelf tag, or wine-list line is readable.'

  const heroPicks = useMemo(() => chooseHeroPicks(wines, hasProfile ? tasteProfile : null), [wines, tasteProfile, hasProfile])
  const heroIds = useMemo(() => new Set(heroPicks.map(p => p.wine.id ?? p.wine.name)), [heroPicks])

  const sortOptions = useMemo(() => [
    { value: 'crowd',  label: 'Crowd Pleasers' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'value',  label: 'Value for Money' },
    { value: 'match',  label: 'My Taste Profile', highlight: !hasProfile },
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
  const noWines = scanAttempted && wines.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
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
              : `${wines.length} wine${wines.length === 1 ? '' : 's'} identified · Tap any to explore`}
          </p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
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

        {/* Hero picks */}
        {heroPicks.length > 0 && (
          <div style={{ padding: `${theme.spacing.lg} ${theme.spacing.lg} 0`, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {heroPicks.map(({ role, wine, reasoning }) => (
              <HeroPickCard
                key={`${role}-${wine.id ?? wine.name}`}
                role={role}
                wine={wine}
                reasoning={reasoning}
                ctaLabel={role === 'topPick' && !hasProfile ? 'Help me find wines I’ll love' : undefined}
                onCta={role === 'topPick' && !hasProfile ? () => navigate('quizIntro') : undefined}
                onTap={onWineSelect}
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
                    <SortToggle options={sortOptions} value={sortKey} onChange={handleSortChange} />
                    {sortedRest.map(wine => (
                      <WineCard
                        key={wine.id ?? wine.name}
                        wine={wine}
                        personalized={false}
                        onTap={onWineSelect}
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

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
