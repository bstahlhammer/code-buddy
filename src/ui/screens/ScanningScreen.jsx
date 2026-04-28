import { useEffect, useRef, useState } from 'react'
import { theme } from '../theme/theme.js'
import { useScan } from '../hooks/useScan.js'

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

export default function ScanningScreen({ navigate, file, onScanComplete }) {
  const [winesFound, setWinesFound] = useState(0)
  const [status, setStatus] = useState(file ? ANTICIPATION_STEPS[0] : 'Pouring the shortlist…')
  const { scanImage } = useScan()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    if (!file) {
      // Demo fallback — no file picked, just show the loading sequence
      const t1 = setTimeout(() => setStatus('Swirling the first clues…'), 700)
      const t2 = setTimeout(() => { setWinesFound(6); setStatus('Pouring the shortlist…') }, 1500)
      const t3 = setTimeout(() => setStatus('Done ✓'), 2200)
      const t4 = setTimeout(() => navigate('anonResults'), 2600)
      return () => [t1, t2, t3, t4].forEach(clearTimeout)
    }

    let cancelled = false
    const wines = []

    const progressTimer = setInterval(() => {
      if (cancelled || wines.length > 0) return
      setStatus((current) => ANTICIPATION_STEPS[(ANTICIPATION_STEPS.indexOf(current) + 1) % ANTICIPATION_STEPS.length])
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
      }
    )
      .then((all) => {
        if (cancelled) return
        clearInterval(progressTimer)
        setStatus('Done ✓')
        onScanComplete?.(all.length ? all : wines)
        setTimeout(() => navigate('anonResults'), 500)
      })
      .catch((err) => {
        if (cancelled) return
        clearInterval(progressTimer)
        console.error('scan failed', err)
        setStatus(wines.length ? 'Pouring what we found…' : 'Scan took too long — pouring a starter list…')
        onScanComplete?.(wines)
        setTimeout(() => navigate('anonResults'), 900)
      })

    return () => {
      cancelled = true
      clearInterval(progressTimer)
    }
  }, [file, navigate, onScanComplete, scanImage])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0A0A0A',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xl,
        padding: theme.spacing.xl,
      }}
    >
      {/* Camera frame */}
      <div
        style={{
          width: 260,
          height: 180,
          position: 'relative',
          border: `1.5px solid ${theme.colors.gold}80`,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#111',
        }}
      >
        {[
          { top: -1, left: -1, borderTop: `2px solid ${theme.colors.gold}`, borderLeft: `2px solid ${theme.colors.gold}` },
          { top: -1, right: -1, borderTop: `2px solid ${theme.colors.gold}`, borderRight: `2px solid ${theme.colors.gold}` },
          { bottom: -1, left: -1, borderBottom: `2px solid ${theme.colors.gold}`, borderLeft: `2px solid ${theme.colors.gold}` },
          { bottom: -1, right: -1, borderBottom: `2px solid ${theme.colors.gold}`, borderRight: `2px solid ${theme.colors.gold}` },
        ].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: 16, height: 16, ...s }} />
        ))}

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: theme.colors.gold,
            boxShadow: `0 0 8px ${theme.colors.gold}`,
            animation: 'scanLine 1.2s ease-in-out infinite alternate',
            top: 4,
          }}
        />

        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              height: 8,
              top: 24 + i * 28,
              backgroundColor: '#ffffff10',
              borderRadius: 2,
              animation: 'pulse 2s ease infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontSize: theme.typography.sizes.md,
            color: theme.colors.cream,
            fontFamily: theme.typography.fontSans,
            letterSpacing: '0.02em',
            marginBottom: 8,
          }}
        >
          {status}
        </div>
        <div style={{
          fontSize: theme.typography.sizes.xs,
          color: `${theme.colors.cream}99`,
          fontFamily: theme.typography.fontSans,
          marginBottom: 8,
        }}>
          {winesFound} wine{winesFound === 1 ? '' : 's'} identified
        </div>
      </div>
    </div>
  )
}
