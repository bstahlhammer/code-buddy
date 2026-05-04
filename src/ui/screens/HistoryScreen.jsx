import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'
import PlacePicker from '../components/PlacePicker.jsx'
import { useScanHistory } from '../hooks/useScanHistory.js'

export default function HistoryScreen({ navigate, goBack, onOpenScan }) {
  const { listScans, deleteScan, updateScanLocation, getPhotoUrl } = useScanHistory()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [thumbs, setThumbs] = useState({})
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { scans } = await listScans()
      if (cancelled) return
      setScans(scans)
      setLoading(false)
      const entries = await Promise.all(
        scans.filter(s => s.photo_path).map(async s => [s.id, await getPhotoUrl(s.photo_path)])
      )
      if (!cancelled) setThumbs(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [listScans, getPhotoUrl])

  async function handleDelete(scan) {
    if (!confirm('Delete this scan?')) return
    await deleteScan(scan)
    setScans(s => s.filter(x => x.id !== scan.id))
  }

  async function handlePickPlace(scan, picked) {
    const update = picked.placeId
      ? { place: picked }
      : { locationLabel: picked.name }
    await updateScanLocation(scan.id, update)
    setScans(s => s.map(x => x.id === scan.id ? {
      ...x,
      location_label: picked.name || picked.placeId ? (picked.name || x.location_label) : null,
      place_id: picked.placeId || null,
      place_address: picked.address || null,
      place_lat: picked.lat ?? null,
      place_lng: picked.lng ?? null,
    } : x))
    setEditingId(null)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <div style={{ backgroundColor: theme.colors.brandDark, flexShrink: 0 }}>
        <TopBar onBack={goBack} onHome={() => navigate('home')} light />
        <div style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl} ${theme.spacing.xl}` }}>
          <div style={{
            fontSize: theme.typography.sizes.xs,
            color: theme.colors.gold,
            fontFamily: theme.typography.fontSans,
            fontWeight: theme.typography.weights.medium,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: theme.spacing.sm,
          }}>
            Cellar journal
          </div>
          <h1 style={{
            fontFamily: theme.typography.fontSerif,
            fontSize: theme.typography.sizes.xxl,

            fontWeight: 600,
            color: theme.colors.cream,
            margin: 0,
          }}>
            Your scan history
          </h1>
        </div>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        {loading && <div style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm }}>Loading…</div>}

        {!loading && scans.length === 0 && (
          <div style={{ textAlign: 'center', padding: `${theme.spacing.xxl} 0` }}>
            <div style={{ fontSize: 36, marginBottom: theme.spacing.sm }}>🍷</div>
            <div style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xl, color: theme.colors.text, marginBottom: theme.spacing.xs }}>
              No scans yet
            </div>
            <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.lg }}>
              Snap a wine list or shelf, it'll show up here.
            </div>
            <button
              onClick={() => navigate('scanPrompt')}
              style={{
                padding: '12px 24px',
                background: `linear-gradient(135deg, ${theme.colors.ember}, ${theme.colors.emberBright})`,
                color: theme.colors.cream,
                border: 'none',
                borderRadius: theme.radius.md,
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.md,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Scan now
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
          {scans.map(scan => (
            <div key={scan.id} style={{
              backgroundColor: '#fff',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radius.md,
              overflow: 'hidden',
              boxShadow: theme.shadows.card,
            }}>
              <button
                onClick={() => onOpenScan?.(scan)}
                style={{
                  display: 'flex',
                  width: '100%',
                  padding: theme.spacing.md,
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  gap: theme.spacing.md,
                  alignItems: 'center',
                }}
              >
                <div style={{
                  width: 56, height: 56,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.surfaceAlt,
                  border: `1px solid ${theme.colors.border}`,
                  flexShrink: 0,
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundImage: thumbs[scan.id] ? `url(${thumbs[scan.id]})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  fontSize: 22,
                }}>
                  {!thumbs[scan.id] && '🍇'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: theme.typography.fontSans,
                    fontWeight: 500,
                    fontSize: theme.typography.sizes.md,
                    color: theme.colors.text,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {scan.location_label || 'Unlabeled scan'}
                    {scan.place_id && <span title="Linked to Google Maps" style={{ fontSize: 11 }}>📍</span>}
                  </div>
                  {scan.place_address && (
                    <div style={{ fontSize: 11, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginTop: 1 }}>
                      {scan.place_address}
                    </div>
                  )}
                  <div style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.fontSans,
                    marginTop: 2,
                  }}>
                    {formatDate(scan.created_at)} · {scan.wine_count} wine{scan.wine_count === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{ color: theme.colors.textMuted, fontSize: 18 }}>›</div>
              </button>

              {editingId === scan.id ? (
                <PlacePicker
                  initialLabel={scan.location_label || ''}
                  onPick={(picked) => handlePickPlace(scan, picked)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div style={{ display: 'flex', borderTop: `1px solid ${theme.colors.border}` }}>
                  <button
                    onClick={() => setEditingId(scan.id)}
                    style={miniBtn('transparent', theme.colors.textMuted)}
                  >
                    {scan.location_label ? 'Edit place' : 'Add place'}
                  </button>
                  {(scan.place_id || scan.location_label) && (
                    <a
                      href={mapsUrl(scan)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ ...miniBtn('transparent', theme.colors.brand), textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      View on Maps
                    </a>
                  )}
                  <button onClick={() => handleDelete(scan)} style={miniBtn('transparent', theme.colors.crimson)}>Delete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function miniBtn(bg, color) {
  return {
    flex: 1,
    padding: '10px 0',
    background: bg,
    color,
    border: 'none',
    fontFamily: "'Inter', sans-serif",
    fontSize: 12,
    cursor: 'pointer',
    letterSpacing: '0.04em',
    textAlign: 'center',
  }
}

function mapsUrl(scan) {
  // Prefer place_id for an exact listing match, fall back to text search
  if (scan.place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(scan.location_label || '')}&query_place_id=${encodeURIComponent(scan.place_id)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(scan.location_label || '')}`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
         ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
