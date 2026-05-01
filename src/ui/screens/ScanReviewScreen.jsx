import { useEffect, useState } from 'react'
import { theme } from '../theme/theme.js'
import { getRatingBuckets } from '@/core/api'
import { useScanHistory } from '../hooks/useScanHistory.js'
import { useWineRatings } from '../hooks/useWineRatings.js'
import { useScanFeedback } from '../hooks/useScanFeedback.js'
import { formatScanLabel } from '../utils/formatScan.js'
import AddWineSheet from '../components/AddWineSheet.jsx'

function BucketRow({ bucketId, onPick }) {
  const buckets = getRatingBuckets()
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {buckets.map(b => {
        const active = bucketId === b.id
        return (
          <button
            key={b.id}
            onClick={() => onPick(b.id)}
            style={{
              flex: '1 1 calc(33% - 6px)',
              minWidth: 92,
              padding: '8px 10px',
              borderRadius: theme.radius.sm,
              border: active ? `1px solid ${theme.colors.magenta}` : `1px solid ${theme.colors.brand}33`,
              background: active ? `${theme.colors.magenta}22` : theme.colors.cream,
              color: theme.colors.brand,
              fontFamily: theme.typography.fontSans,
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span aria-hidden>{b.emoji}</span>
            <span>{b.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function ScanReviewScreen({ scan, wines = [], goBack, onSaved, onAddWine, onToast }) {
  const [ratings, setRatings] = useState({}) // { [wineId]: bucketId }
  const [photoUrl, setPhotoUrl] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackNote, setFeedbackNote] = useState('')
  const [addWineOpen, setAddWineOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { getPhotoUrl } = useScanHistory()
  const { saveRating } = useWineRatings()
  const { reportFeedback } = useScanFeedback()

  useEffect(() => {
    let cancelled = false
    if (scan?.photo_path) {
      ;(async () => {
        const url = await getPhotoUrl(scan.photo_path)
        if (!cancelled) setPhotoUrl(url)
      })()
    }
    return () => { cancelled = true }
  }, [scan?.photo_path, getPhotoUrl])

  async function handleSave() {
    setSaving(true)
    const entries = Object.entries(ratings)
    for (const [wineId, bucketId] of entries) {
      await saveRating({ wineId, bucketId })
    }
    setSaving(false)
    onToast?.(entries.length ? `Saved ${entries.length} rating${entries.length === 1 ? '' : 's'}` : 'No ratings to save')
    onSaved?.()
  }

  async function submitFeedback() {
    await reportFeedback({
      scanId: scan?.id,
      reason: 'none_match',
      note: feedbackNote.trim() || null,
    })
    setFeedbackOpen(false)
    setFeedbackNote('')
    onToast?.('Thanks — your feedback helps us improve.')
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: `linear-gradient(180deg, ${theme.colors.parchment} 0%, ${theme.colors.cream} 100%)`,
      color: theme.colors.brand,
    }}>
      {/* Header */}
      <div style={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.sm, flexShrink: 0 }}>
        <button
          onClick={goBack}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: theme.colors.brand, fontFamily: theme.typography.fontSans,
            fontSize: 13, padding: 0, marginBottom: 8,
          }}
        >
          ← Back
        </button>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
          color: theme.colors.magenta, fontFamily: theme.typography.fontSans,
        }}>
          What did you enjoy?
        </div>
        <h1 style={{
          fontFamily: theme.typography.fontDisplay,
          fontSize: 22, lineHeight: 1.2, margin: '4px 0 0 0',
          color: theme.colors.brand, fontWeight: 600,
        }}>
          {formatScanLabel(scan) || 'Recent scan'}
        </h1>
        {scan?.place_address && (
          <div style={{
            fontSize: 12, opacity: 0.7, marginTop: 4,
            fontFamily: theme.typography.fontSans,
          }}>
            {scan.place_address}
          </div>
        )}
      </div>

      {/* Body (scrollable) */}
      <div style={{
        flex: '1 1 0', minHeight: 0, overflowY: 'auto',
        padding: `0 ${theme.spacing.lg} ${theme.spacing.xl}`,
        display: 'flex', flexDirection: 'column', gap: theme.spacing.md,
      }}>
        {photoUrl && (
          <div style={{
            borderRadius: theme.radius.md, overflow: 'hidden',
            boxShadow: `0 4px 16px ${theme.colors.brand}22`,
          }}>
            <img src={photoUrl} alt="Scan photo" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        {wines.length === 0 ? (
          <div style={{
            padding: theme.spacing.lg, textAlign: 'center',
            background: theme.colors.cream, borderRadius: theme.radius.md,
            fontFamily: theme.typography.fontSans, fontSize: 13, opacity: 0.7,
          }}>
            No wines saved on this scan yet.
          </div>
        ) : (
          wines.map((w, idx) => {
            const wid = w.id ?? `${scan?.id}-${idx}`
            return (
              <div
                key={wid}
                style={{
                  padding: theme.spacing.md,
                  background: theme.colors.cream,
                  border: `1px solid ${theme.colors.brand}1a`,
                  borderRadius: theme.radius.md,
                  display: 'flex', flexDirection: 'column', gap: theme.spacing.sm,
                }}
              >
                <div>
                  <div style={{
                    fontFamily: theme.typography.fontDisplay,
                    fontSize: 16, fontWeight: 600, lineHeight: 1.2,
                  }}>{w.name || 'Unnamed wine'}</div>
                  <div style={{
                    fontFamily: theme.typography.fontSans, fontSize: 12,
                    opacity: 0.7, marginTop: 2,
                  }}>
                    {[w.vintage, w.region, w.grape].filter(Boolean).join(' · ') || ' '}
                  </div>
                </div>
                <BucketRow
                  bucketId={ratings[wid]}
                  onPick={(bucketId) => setRatings(r => ({ ...r, [wid]: bucketId }))}
                />
              </div>
            )
          })
        )}

        {/* Manual add */}
        <button
          onClick={() => setAddWineOpen(true)}
          style={{
            padding: theme.spacing.md,
            background: 'transparent',
            border: `1px dashed ${theme.colors.brand}55`,
            borderRadius: theme.radius.md,
            color: theme.colors.brand,
            fontFamily: theme.typography.fontSans,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          + I picked something not on this list
        </button>

        {/* Feedback */}
        {!feedbackOpen ? (
          <button
            onClick={() => setFeedbackOpen(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: theme.colors.brand, opacity: 0.7,
              fontFamily: theme.typography.fontSans, fontSize: 12,
              textDecoration: 'underline', alignSelf: 'center', padding: 6,
            }}
          >
            None of these match what I saw
          </button>
        ) : (
          <div style={{
            padding: theme.spacing.md,
            background: `${theme.colors.peach}22`,
            border: `1px solid ${theme.colors.peach}66`,
            borderRadius: theme.radius.md,
            display: 'flex', flexDirection: 'column', gap: theme.spacing.sm,
          }}>
            <div style={{ fontFamily: theme.typography.fontSans, fontSize: 13, lineHeight: 1.4 }}>
              Sorry about that. Your feedback helps us read labels better.
            </div>
            <textarea
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              placeholder="Optional: anything you remember about the wines you actually saw?"
              rows={3}
              style={{
                width: '100%', padding: 10,
                fontFamily: theme.typography.fontSans, fontSize: 13,
                borderRadius: theme.radius.sm,
                border: `1px solid ${theme.colors.brand}33`,
                resize: 'vertical', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={submitFeedback}
                style={{
                  flex: 1, padding: '10px', borderRadius: theme.radius.sm,
                  border: 'none', cursor: 'pointer',
                  background: theme.colors.brand, color: theme.colors.cream,
                  fontFamily: theme.typography.fontSans, fontSize: 13, fontWeight: 600,
                }}
              >Send feedback</button>
              <button
                onClick={() => { setFeedbackOpen(false); setFeedbackNote('') }}
                style={{
                  padding: '10px 14px', borderRadius: theme.radius.sm,
                  border: `1px solid ${theme.colors.brand}33`, cursor: 'pointer',
                  background: 'transparent', color: theme.colors.brand,
                  fontFamily: theme.typography.fontSans, fontSize: 13,
                }}
              >Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer save bar */}
      <div style={{
        flexShrink: 0,
        padding: theme.spacing.lg,
        borderTop: `1px solid ${theme.colors.brand}1a`,
        background: theme.colors.cream,
      }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%', padding: '14px',
            background: `linear-gradient(180deg, ${theme.colors.goldBright}, ${theme.colors.gold})`,
            color: theme.colors.brandDark, border: 'none',
            borderRadius: theme.radius.sm, cursor: saving ? 'wait' : 'pointer',
            fontFamily: theme.typography.fontSans, fontSize: 14, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            boxShadow: theme.shadows.brass,
          }}
        >
          {saving ? 'Saving…' : 'Save ratings'}
        </button>
      </div>

      {addWineOpen && (
        <AddWineSheet
          onClose={() => setAddWineOpen(false)}
          onSaved={(label) => {
            setAddWineOpen(false)
            onToast?.(label || 'Wine logged')
          }}
        />
      )}
    </div>
  )
}
