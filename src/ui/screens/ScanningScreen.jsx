import { useEffect, useRef, useState, useMemo } from 'react'
import { theme } from '../theme/theme.js'
import { useScan } from '../hooks/useScan.js'
import { WINE_FACTS } from '../data/wineFacts.js'

const ANTICIPATION_STEPS = [
  'Cutting the foil…',
  'Easing out the cork…',
  'Letting the list breathe…',
  'Swirling the first clues…',
  'Catching the aroma…',
  'Tasting for vintages…',
  'Decanting the details…',
  'Pouring the shortlist…',
]

const BUYING_FOR = [
  { id: 'me',    label: 'Just me' },
  { id: 'group', label: 'A group' },
  { id: 'gift',  label: 'A gift' },
]

const INTENT_TAGS = [
  { id: 'crowd',   label: 'Crowd pleaser' },
  { id: 'unique',  label: 'Unique & interesting' },
  { id: 'splurge', label: 'A splurge' },
  { id: 'maker',   label: 'A specific maker' },
  { id: 'region',  label: 'A specific region' },
  { id: 'varietal',label: 'A specific varietal' },
]

export default function ScanningScreen({
  navigate,
  file,
  buyingFor,
  onBuyingForChange,
  scanIntent,
  onScanIntentChange,
  tasteProfile,
  onScanComplete,
}) {
  const [winesFound, setWinesFound] = useState(0)
  const [status, setStatus] = useState(file ? ANTICIPATION_STEPS[0] : 'Pouring the shortlist…')
  const [thumbUrl, setThumbUrl] = useState(null)
  const [factIdx, setFactIdx] = useState(() => Math.floor(Math.random() * WINE_FACTS.length))
  const [scanDone, setScanDone] = useState(false)
  const pendingNavRef = useRef(null)
  const { scanImage } = useScan()
  const callbacksRef = useRef({ navigate, onScanComplete })
  callbacksRef.current = { navigate, onScanComplete }

  const hasProfile = !!tasteProfile

  // Preview thumbnail of selected file
  useEffect(() => {
    if (!file) { setThumbUrl(null); return }
    const url = URL.createObjectURL(file)
    setThumbUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Rotate wine facts while scanning
  useEffect(() => {
    if (scanDone) return
    const t = setInterval(() => {
      setFactIdx(i => (i + 1) % WINE_FACTS.length)
    }, 5500)
    return () => clearInterval(t)
  }, [scanDone])

  useEffect(() => {
    if (!file) {
      const t1 = setTimeout(() => setStatus('Swirling the first clues…'), 700)
      const t2 = setTimeout(() => { setWinesFound(6); setStatus('Pouring the shortlist…') }, 1500)
      const t3 = setTimeout(() => setStatus('Done ✓'), 2200)
      const t4 = setTimeout(() => setScanDone(true), 2400)
      return () => [t1, t2, t3, t4].forEach(clearTimeout)
    }

    let cancelled = false
    const wines = []

    let stepIndex = 0
    const progressTimer = setInterval(() => {
      if (cancelled || wines.length > 0) return
      stepIndex = (stepIndex + 1) % ANTICIPATION_STEPS.length
      setStatus(ANTICIPATION_STEPS[stepIndex])
    }, 1800)

    scanImage(
      file,
      (wine, count) => {
        if (cancelled) return
        wines.push(wine)
        setWinesFound(count)
        setStatus(count < 4 ? 'Filling the first glasses…' : 'Pouring the shortlist…')
      },
      (progress) => {
        if (cancelled || !progress?.message) return
        setStatus(progress.message)
      },
    )
      .then((result) => {
        if (cancelled) return
        clearInterval(progressTimer)
        setStatus('Done ✓')
        const payload = result && typeof result === 'object' && Array.isArray(result.wines)
          ? result
          : { wines: wines, readability: wines.length ? 'good' : 'unreadable', retakeReasons: [], message: '' }
        callbacksRef.current.onScanComplete?.(payload)
        pendingNavRef.current = 'anonResults'
        setScanDone(true)
      })
      .catch((err) => {
        if (cancelled) return
        clearInterval(progressTimer)
        console.error('scan failed', err)
        if (wines.length) {
          setStatus('Pouring what we found…')
          callbacksRef.current.onScanComplete?.({ wines, readability: 'partial', retakeReasons: err?.retakeReasons || [], message: err?.message || '' })
          pendingNavRef.current = 'anonResults'
          setScanDone(true)
          return
        }
        const message = err?.message || 'I could not identify a specific wine. Try a closer, sharper photo where the full label or shelf tag is readable.'
        setStatus(message)
        callbacksRef.current.onScanComplete?.({ wines: [], readability: err?.readability || 'unreadable', retakeReasons: err?.retakeReasons || [], message })
        pendingNavRef.current = 'anonResults'
        setScanDone(true)
      })

    return () => {
      cancelled = true
      clearInterval(progressTimer)
    }
  }, [file, scanImage])

  // After scan finishes AND user picked a buying-for, advance.
  useEffect(() => {
    if (!scanDone) return
    if (!buyingFor) return
    const t = setTimeout(() => {
      const dest = pendingNavRef.current || 'anonResults'
      callbacksRef.current.navigate(dest)
    }, 350)
    return () => clearTimeout(t)
  }, [scanDone, buyingFor])

  const fact = useMemo(() => WINE_FACTS[factIdx], [factIdx])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(168deg, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 100%)`,
        alignItems: 'stretch',
        padding: theme.spacing.xl,
        gap: theme.spacing.lg,
        overflowY: 'auto',
      }}
    >
      {/* Thumbnail with scan animation */}
      <div
        style={{
          alignSelf: 'center',
          width: 240,
          height: 180,
          position: 'relative',
          borderRadius: 10,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.magenta}66`,
          boxShadow: `0 12px 36px ${theme.colors.brandDark}`,
          background: theme.colors.brandDark,
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt="Your scan"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              filter: scanDone ? 'none' : 'blur(6px) saturate(0.85) brightness(0.75)',
              transition: 'filter 400ms ease',
            }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 48, opacity: 0.5,
          }}>🍷</div>
        )}

        {/* dim overlay while scanning */}
        {!scanDone && (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, ${theme.colors.brandDark}55, ${theme.colors.brandDark}aa)`,
          }} />
        )}

        {/* sweeping scan line */}
        {!scanDone && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              height: 2,
              background: theme.colors.magentaBright,
              boxShadow: `0 0 14px ${theme.colors.magentaBright}, 0 0 28px ${theme.colors.magenta}`,
              animation: 'scanLine 1.6s ease-in-out infinite alternate',
              top: 8,
            }}
          />
        )}

        {/* corner crops */}
        {[
          { top: 6, left: 6, borderTop: `2px solid ${theme.colors.magentaBright}`, borderLeft: `2px solid ${theme.colors.magentaBright}` },
          { top: 6, right: 6, borderTop: `2px solid ${theme.colors.magentaBright}`, borderRight: `2px solid ${theme.colors.magentaBright}` },
          { bottom: 6, left: 6, borderBottom: `2px solid ${theme.colors.magentaBright}`, borderLeft: `2px solid ${theme.colors.magentaBright}` },
          { bottom: 6, right: 6, borderBottom: `2px solid ${theme.colors.magentaBright}`, borderRight: `2px solid ${theme.colors.magentaBright}` },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 14, height: 14, ...s }} />
        ))}
      </div>

      {/* Status */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: theme.typography.fontDisplay,
          fontSize: theme.typography.sizes.lg,
          color: theme.colors.cream,
          letterSpacing: '0.02em',
          marginBottom: 4,
        }}>
          {status}
        </div>
        <div style={{
          fontSize: theme.typography.sizes.xs,
          color: `${theme.colors.cream}99`,
          fontFamily: theme.typography.fontSans,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          {winesFound} wine{winesFound === 1 ? '' : 's'} identified
        </div>
      </div>

      {/* Wine fact */}
      <div
        key={factIdx}
        style={{
          background: `linear-gradient(135deg, ${theme.colors.parchment}1a, ${theme.colors.cream}10)`,
          border: `1px solid ${theme.colors.cream}22`,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          animation: 'fade-in 600ms ease-out',
        }}
      >
        <div style={{
          fontSize: 10, fontFamily: theme.typography.fontSans, fontWeight: 700,
          letterSpacing: '0.22em', textTransform: 'uppercase',
          color: theme.colors.peach, marginBottom: 6,
        }}>
          While we pour…
        </div>
        <p style={{
          fontFamily: theme.typography.fontDisplay,
          fontSize: 15, fontStyle: 'italic',
          color: theme.colors.cream, lineHeight: 1.5, margin: 0,
        }}>
          {fact}
        </p>
      </div>

      {/* Buying-for question (asked during scan) */}
      <div>
        <div style={{
          fontSize: 11, fontFamily: theme.typography.fontSans, fontWeight: 700,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: `${theme.colors.cream}cc`, marginBottom: 8, textAlign: 'center',
        }}>
          Who are you choosing for?
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.sm }}>
          {BUYING_FOR.map(opt => {
            const active = buyingFor === opt.id
            return (
              <button
                key={opt.id}
                onClick={() => onBuyingForChange?.(opt.id)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: theme.radius.pill,
                  border: `1.5px solid ${active ? theme.colors.magentaBright : `${theme.colors.cream}55`}`,
                  background: active ? `${theme.colors.magenta}33` : 'transparent',
                  color: theme.colors.cream,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  fontFamily: theme.typography.fontSans,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
        {scanDone && !buyingFor && (
          <p style={{
            marginTop: 8, textAlign: 'center',
            fontFamily: theme.typography.fontSans, fontSize: 11,
            color: `${theme.colors.peach}dd`,
          }}>
            Pick one to see your shortlist →
          </p>
        )}
      </div>

      {/* Intent question, only when buying for group or gift */}
      {(buyingFor === 'group' || buyingFor === 'gift') && (
        <IntentPicker
          intent={scanIntent}
          onChange={onScanIntentChange}
        />
      )}

      {/* No-profile invite */}
      {!hasProfile && (
        <button
          onClick={() => navigate('quizIntro')}
          style={{
            marginTop: 'auto',
            padding: theme.spacing.md,
            background: 'transparent',
            border: `1px dashed ${theme.colors.cream}55`,
            borderRadius: theme.radius.md,
            color: theme.colors.cream,
            fontFamily: theme.typography.fontSans,
            fontSize: 13,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', color: theme.colors.peach, marginBottom: 4,
          }}>
            New here?
          </div>
          Build your taste profile while we scan. Better matches in 60 seconds. →
        </button>
      )}
    </div>
  )
}
