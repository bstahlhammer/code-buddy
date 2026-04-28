import { useMemo, useState } from 'react'
import { theme } from '../theme/theme.js'
import { getWines, sortWines } from '@/core/api'
import WineCard from '../components/WineCard.jsx'
import SortToggle from '../components/SortToggle.jsx'
import UpsellBanner from '../components/UpsellBanner.jsx'
import BottomNav from '../components/BottomNav.jsx'
import TopBar from '../components/TopBar.jsx'

export default function AnonResultsScreen({ navigate, goBack, onWineSelect, tasteProfile, scannedWines }) {
  const hasProfile = !!tasteProfile
  const [sortKey, setSortKey] = useState('crowd')
  const resultWines = scannedWines?.length ? scannedWines : getWines().slice(0, 12)

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

  const sortedWines = useMemo(
    () => sortWines(resultWines, sortKey, hasProfile ? tasteProfile : null),
    [resultWines, sortKey, tasteProfile, hasProfile]
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      {/* Header */}
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.md}` }}>
          <h1 style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xxl, color: theme.colors.cream, fontWeight: theme.typography.weights.normal }}>
            Wine List Results
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginTop: 4 }}>
            {resultWines.length} wines identified · Tap any to explore
          </p>
          <div style={{ marginTop: theme.spacing.md }}>
            <SortToggle options={sortOptions} value={sortKey} onChange={handleSortChange} />
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Upsell banner */}
        <UpsellBanner onCta={() => navigate('quizIntro')} />

        {/* Wine cards */}
        <div style={{ padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}`, display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          {sortedWines.map(wine => (
            <WineCard
              key={wine.id}
              wine={wine}
              personalized={false}
              onTap={onWineSelect}
            />
          ))}
        </div>
      </div>

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
