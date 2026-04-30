/**
 * ShelfSpotlight — given a scan photo URL and a normalized bbox,
 * renders the photo with a "spotlight cone" effect that draws the eye
 * to the requested bottle.
 *
 * - Outside the cone: black & white + heavy dim
 * - Inside the cone: full color, sharp, with a soft warm glow
 * - Edges of the cone: gentle radial fade so it feels like a flashlight
 *
 * If `loading` is true we show a "Pinpointing the bottle…" overlay.
 * If `bbox` is null we show the photo with a "Couldn't locate this bottle" hint.
 */
import { theme } from '../theme/theme.js'

export default function ShelfSpotlight({ photoUrl, bbox, loading, error, onRetry, label }) {
  if (!photoUrl) {
    return (
      <div style={emptyShell}>
        <span>No shelf photo for this scan.</span>
      </div>
    )
  }

  const hasBbox = bbox && bbox.w > 0 && bbox.h > 0
  // Center of the spotlight in % of container
  const cx = hasBbox ? (bbox.x + bbox.w / 2) * 100 : 50
  const cy = hasBbox ? (bbox.y + bbox.h / 2) * 100 : 50
  // Ellipse radii sized to the bbox itself (with padding) so the spotlight
  // hugs the bottle's tall, narrow shape instead of a generic circle.
  // 0.75 = bbox half-extent, +padding for breathing room.
  const padX = 6 // % of container width
  const padY = 4 // % of container height
  const rxInner = hasBbox ? (bbox.w / 2) * 100 + padX : 0
  const ryInner = hasBbox ? (bbox.h / 2) * 100 + padY : 0
  const rxOuter = rxInner + 10
  const ryOuter = ryInner + 8
  const innerShape = `ellipse ${rxInner}% ${ryInner}% at ${cx}% ${cy}%`
  const outerShape = `ellipse ${rxOuter}% ${ryOuter}% at ${cx}% ${cy}%`

  return (
    <div style={frame}>
      {/* Base layer: B&W + dimmed */}
      <img
        src={photoUrl}
        alt={label ? `Shelf where ${label} is located` : 'Shelf photo'}
        style={{
          ...imgFill,
          filter: 'grayscale(1) brightness(0.45) contrast(1.05)',
        }}
        draggable={false}
      />

      {/* Color layer: same image, masked to spotlight */}
      {hasBbox && !loading && (
        <img
          src={photoUrl}
          alt=""
          aria-hidden
          style={{
            ...imgFill,
            WebkitMaskImage: `radial-gradient(circle at ${cx}% ${cy}%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${rInner}%, rgba(0,0,0,0) ${rOuter}%)`,
            maskImage: `radial-gradient(circle at ${cx}% ${cy}%, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${rInner}%, rgba(0,0,0,0) ${rOuter}%)`,
            filter: 'saturate(1.15) contrast(1.05)',
          }}
          draggable={false}
        />
      )}

      {/* Warm glow ring around the bottle */}
      {hasBbox && !loading && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(circle at ${cx}% ${cy}%, ${theme.colors.emberBright}38 0%, ${theme.colors.ember}14 ${rInner * 0.7}%, transparent ${rOuter}%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Tight bbox highlight (subtle) */}
      {hasBbox && !loading && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: `${bbox.x * 100}%`,
            top: `${bbox.y * 100}%`,
            width: `${bbox.w * 100}%`,
            height: `${bbox.h * 100}%`,
            border: `1.5px solid ${theme.colors.emberBright}`,
            borderRadius: 4,
            boxShadow: `0 0 18px 2px ${theme.colors.ember}66`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Loading state */}
      {loading && (
        <div style={overlayCenter}>
          <div style={overlayPill}>
            <span style={pulseDot} />
            <span>Pinpointing the bottle…</span>
          </div>
        </div>
      )}

      {/* No-bbox state */}
      {!loading && !hasBbox && (
        <div style={overlayCenter}>
          <div style={{ ...overlayPill, background: `${theme.colors.brandDark}E6` }}>
            <span>{error ? 'Could not locate this bottle.' : 'No shelf location yet.'}</span>
            {onRetry && (
              <button onClick={onRetry} style={retryBtn}>
                {error ? 'Retry' : 'Find on shelf'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const frame = {
  position: 'relative',
  width: '100%',
  aspectRatio: '4 / 3',
  overflow: 'hidden',
  borderRadius: theme.radius.md,
  background: '#000',
  border: `1px solid ${theme.colors.border}`,
}

const imgFill = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  userSelect: 'none',
}

const overlayCenter = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
}

const overlayPill = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 16px',
  background: `${theme.colors.brandDark}D9`,
  color: theme.colors.cream,
  borderRadius: theme.radius.pill,
  fontFamily: theme.typography.fontSans,
  fontSize: 13,
  border: `1px solid ${theme.colors.ember}66`,
}

const pulseDot = {
  width: 8, height: 8,
  borderRadius: '50%',
  background: theme.colors.emberBright,
  boxShadow: `0 0 12px ${theme.colors.emberBright}`,
  animation: 'spotlightPulse 1.2s ease-in-out infinite',
}

const retryBtn = {
  marginLeft: 4,
  padding: '4px 10px',
  background: theme.colors.ember,
  color: theme.colors.cream,
  border: 'none',
  borderRadius: theme.radius.sm,
  fontFamily: theme.typography.fontSans,
  fontSize: 12,
  cursor: 'pointer',
}

const emptyShell = {
  ...frame,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.colors.textMuted,
  fontFamily: theme.typography.fontSans,
  fontSize: 13,
  background: theme.colors.surfaceAlt,
}
