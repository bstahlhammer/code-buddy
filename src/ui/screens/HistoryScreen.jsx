import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'
import TopBar from '../components/TopBar.jsx'
import { useScanHistory } from '../hooks/useScanHistory.js'

export default function HistoryScreen({ navigate, goBack, onOpenScan }) {
  const { listScans, deleteScan, updateScanLocation, getPhotoUrl } = useScanHistory()
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [thumbs, setThumbs] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { scans } = await listScans()
      if (cancelled) return
      setScans(scans)
      setLoading(false)
      // Load signed thumbs in parallel
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

  async function handleSaveLabel(scan) {
    await updateScanLocation(scan.id, editLabel)
    setScans(s => s.map(x => x.id === scan.id ? { ...x, location_label: editLabel } : x))
    setEditingId(null)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: theme.colors.surface }}>
      <div style={{ backgroundColor: theme.colors.brandDark }}>
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
            fontStyle: 'italic',
            fontWeight: 400,
            color: theme.colors.cream,
            margin: 0,
          }}>
            Your scan history
          </h1>
        </div>
      </div>

      <div className="hide-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: theme.spacing.xl }}>
        {loading && <div style={{ color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, fontSize: theme.typography.sizes.sm }}>Loading…</div>}

        {!loading && scans.length === 0 && (
          <div style={{ textAlign: 'center', padding: `${theme.spacing.xxl} 0` }}>
            <div style={{ fontSize: 36, marginBottom: theme.spacing.sm }}>🍷</div>
            <div style={{ fontFamily: theme.typography.fontSerif, fontSize: theme.typography.sizes.xl, fontStyle: 'italic', color: theme.colors.text, marginBottom: theme.spacing.xs }}>
              No scans yet
            </div>
            <div style={{ fontSize: theme.typography.sizes.sm, color: theme.colors.textMuted, fontFamily: theme.typography.fontSans, marginBottom: theme.spacing.lg }}>
              Snap a wine list or shelf — it'll show up here.
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
                  }}>
                    {scan.location_label || 'Unlabeled scan'}
                  </div>
                  <div style={{
                    fontSize: theme.typography.sizes.sm,
                    color: theme.colors.textMuted,
                    fontFamily: theme.typography.fontSans,
                  }}>
                    {formatDate(scan.created_at)} · {scan.wine_count} wine{scan.wine_count === 1 ? '' : 's'}
                  </div>
                </div>
                <div style={{ color: theme.colors.textMuted, fontSize: 18 }}>›</div>
              </button>

              <div style={{ display: 'flex', borderTop: `1px solid ${theme.colors.border}` }}>
                {editingId === scan.id ? (
                  <>
                    <input
                      autoFocus
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      placeholder="Restaurant or store…"
                      style={{
                        flex: 1,
                        border: 'none',
                        padding: '10px 14px',
                        fontFamily: theme.typography.fontSans,
                        fontSize: theme.typography.sizes.sm,
                        background: theme.colors.surfaceAlt,
                        outline: 'none',
                      }}
                    />
                    <button onClick={() => handleSaveLabel(scan)} style={miniBtn(theme.colors.brand, theme.colors.cream)}>Save</button>
                    <button onClick={() => setEditingId(null)} style={miniBtn('transparent', theme.colors.textMuted)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => { setEditingId(scan.id); setEditLabel(scan.location_label || '') }}
                      style={miniBtn('transparent', theme.colors.textMuted)}
                    >
                      {scan.location_label ? 'Edit label' : 'Add label'}
                    </button>
                    <button onClick={() => handleDelete(scan)} style={miniBtn('transparent', theme.colors.crimson)}>Delete</button>
                  </>
                )}
              </div>
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
  }
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
         ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
