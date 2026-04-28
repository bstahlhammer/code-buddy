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
  const scanAttempted = !!scannedWines
  const scanMessage = !Array.isArray(scannedWines) && scannedWines?.message
    ? scannedWines.message
    : 'I could not identify a specific wine from that image. Try a closer, sharper photo where the full bottle label, shelf tag, or wine-list line is readable.'
  const resultWines = Array.isArray(scannedWines)
    ? scannedWines
    : scanAttempted
      ? []
      : getWines().slice(0, 12)

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
            {scanAttempted && resultWines.length === 0 ? 'No Wine Identified' : 'Wine List Results'}
          </h1>
          <p style={{ fontSize: theme.typography.sizes.sm, color: `${theme.colors.cream}80`, fontFamily: theme.typography.fontSans, marginTop: 4 }}>
            {resultWines.length > 0 ? `${resultWines.length} wines identified · Tap any to explore` : 'Take another photo to get a reliable result'}
          </p>
          {resultWines.length > 0 && (
            <div style={{ marginTop: theme.spacing.md }}>
              <SortToggle options={sortOptions} value={sortKey} onChange={handleSortChange} />
            </div>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
        {resultWines.length > 0 && <UpsellBanner onCta={() => navigate('quizIntro')} />}

        {resultWines.length === 0 ? (
          <div style={{ padding: theme.spacing.lg, display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceAlt, padding: theme.spacing.lg, boxShadow: theme.shadows.card }}>
              <p style={{ fontFamily: theme.typography.fontDisplay, fontSize: theme.typography.sizes.lg, color: theme.colors.text, lineHeight: 1.35, marginBottom: theme.spacing.sm }}>
                {scanMessage}
              </p>
              <ul style={{ fontFamily: theme.typography.fontSans, color: theme.colors.textMuted, fontSize: theme.typography.sizes.sm, lineHeight: 1.6, paddingLeft: theme.spacing.lg, marginBottom: theme.spacing.md }}>
                <li>Move closer so one label or shelf tag fills the frame.</li>
                <li>Keep the camera square to the bottle or wine-list line.</li>
                <li>Retake in brighter light and avoid glare.</li>
              </ul>
              <button
                onClick={() => navigate('scanPrompt')}
                style={{ width: '100%', border: 'none', borderRadius: theme.radius.sm, background: theme.gradients.gold, color: theme.colors.brandDark, padding: `${theme.spacing.sm} ${theme.spacing.md}`, fontFamily: theme.typography.fontSans, fontWeight: theme.typography.weights.bold, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer' }}
              >
                Try another photo
              </button>
            </div>
          </div>
        ) : (
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
        )}
      </div>

      <BottomNav activeTab="scan" navigate={navigate} tasteProfile={tasteProfile} />
    </div>
  )
}
