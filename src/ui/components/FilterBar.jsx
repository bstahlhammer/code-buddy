import { theme } from '../theme/theme.js'
import { countActiveFilters, COLOR_LABELS } from '@/core/api'

const COLOR_DOTS = {
  red:      '#7B1D1D',
  white:    '#C8B98A',
  rosé:     '#C45A78',
  sparkling:'#6A9CB8',
  orange:   '#B46830',
}

export default function FilterBar({
  sortKey, onSortChange, sortOptions,
  filters, onOpen, onChange, facets,
  resultCount, totalCount,
}) {
  const activeColors  = filters?.colors || []
  const activeCount   = countActiveFilters(filters)
  const deepCount     = activeCount - activeColors.length

  const availableColors = facets?.colors || []

  return (
    <div style={{
      padding: `${theme.spacing.sm} ${theme.spacing.lg} ${theme.spacing.xs}`,
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>

      {/* ── Row 1: Sort intent ── */}
      {sortOptions?.length > 0 && (
        <div style={{ display: 'flex', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
          {sortOptions.map(({ value, label, highlight }) => {
            const active   = sortKey === value
            const isUpsell = highlight && !active

            return (
              <button
                key={value}
                onClick={() => onSortChange(value)}
                style={{
                  padding: '7px 14px',
                  borderRadius: theme.radius.pill,
                  fontFamily: theme.typography.fontSans,
                  fontSize: theme.typography.sizes.sm,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  border: isUpsell
                    ? `1px solid ${theme.colors.gold}90`
                    : `1px solid ${active ? theme.colors.brand : theme.colors.border}`,
                  background: isUpsell
                    ? `${theme.colors.gold}15`
                    : (active ? theme.colors.brand : 'transparent'),
                  color: isUpsell
                    ? theme.colors.gold
                    : (active ? theme.colors.cream : theme.colors.textMuted),
                }}
              >
                {isUpsell && <span style={{ marginRight: 4, fontSize: 11 }}>✦</span>}
                {label}
                {isUpsell && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.7 }}>→</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* ── Row 2: Color quick-chips + Filters button ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
        {availableColors.map(color => {
          const key    = color.toLowerCase()
          const active = activeColors.includes(color)
          const dot    = COLOR_DOTS[key] || theme.colors.border

          return (
            <button
              key={color}
              onClick={() => {
                const cur  = filters?.colors || []
                const next = cur.includes(color) ? cur.filter(c => c !== color) : [...cur, color]
                onChange({ ...filters, colors: next })
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 10px',
                borderRadius: theme.radius.pill,
                border: `1px solid ${active ? dot : theme.colors.border}`,
                background: active ? `${dot}22` : 'transparent',
                color: active ? theme.colors.text : theme.colors.textMuted,
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.xs,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: dot, flexShrink: 0,
              }} />
              {COLOR_LABELS[color] || color}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        <button
          onClick={onOpen}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 12px',
            borderRadius: theme.radius.pill,
            border: `1px solid ${deepCount > 0 ? theme.colors.gold : theme.colors.border}`,
            background: deepCount > 0 ? `${theme.colors.gold}15` : 'transparent',
            color: deepCount > 0 ? theme.colors.gold : theme.colors.textMuted,
            fontFamily: theme.typography.fontSans,
            fontSize: theme.typography.sizes.xs,
            fontWeight: deepCount > 0 ? 600 : 400,
            cursor: 'pointer',
            transition: 'all 0.12s ease',
          }}
        >
          <span style={{ fontSize: 12, lineHeight: 1 }}>⚙</span>
          <span>Filters</span>
          {deepCount > 0 && (
            <span style={{
              minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 8, background: theme.colors.gold,
              color: theme.colors.cream, fontSize: 10,
              lineHeight: '16px', textAlign: 'center', fontWeight: 700,
            }}>
              {deepCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Row 3: Active deep-filter chips (non-color) ── */}
      {deepCount > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs }}>
          {buildDeepChips(filters).map(chip => (
            <button
              key={chip.key}
              onClick={() => onChange(chip.remove(filters))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 9px',
                borderRadius: theme.radius.pill,
                background: theme.colors.surfaceAlt,
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text,
                fontFamily: theme.typography.fontSans,
                fontSize: theme.typography.sizes.xs,
                cursor: 'pointer',
              }}
            >
              {chip.label}
              <span style={{ color: theme.colors.textMuted }}>×</span>
            </button>
          ))}
          <button
            onClick={() => onChange({
              priceMin: undefined, priceMax: undefined,
              colors: [], varietalsInclude: [], varietalsExclude: [],
              makers: [], regions: [], certifications: [],
            })}
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none',
              color: theme.colors.gold, fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.xs, cursor: 'pointer',
              fontWeight: 600, padding: 0,
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Status: filter result count (when color-only filters active) ── */}
      {activeCount > 0 && deepCount === 0 && typeof resultCount === 'number' && resultCount !== totalCount && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontFamily: theme.typography.fontSans,
          fontSize: theme.typography.sizes.xs,
          color: theme.colors.textMuted,
        }}>
          <span>{resultCount} of {totalCount} wines</span>
          <button
            onClick={() => onChange({ ...filters, colors: [] })}
            style={{
              background: 'transparent', border: 'none',
              color: theme.colors.gold, fontFamily: theme.typography.fontSans,
              fontSize: theme.typography.sizes.xs, cursor: 'pointer',
              fontWeight: 600, padding: 0,
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

function buildDeepChips(f) {
  if (!f) return []
  const chips = []
  if (typeof f.priceMin === 'number' || typeof f.priceMax === 'number') {
    chips.push({
      key: 'price', label: `$${f.priceMin ?? 0}–${f.priceMax ?? '∞'}`,
      remove: (cur) => ({ ...cur, priceMin: undefined, priceMax: undefined }),
    })
  }
  for (const v of f.varietalsInclude || []) {
    chips.push({
      key: `vinc:${v}`, label: v,
      remove: (cur) => ({ ...cur, varietalsInclude: cur.varietalsInclude.filter(x => x !== v) }),
    })
  }
  for (const v of f.varietalsExclude || []) {
    chips.push({
      key: `vexc:${v}`, label: `⊘ ${v}`,
      remove: (cur) => ({ ...cur, varietalsExclude: cur.varietalsExclude.filter(x => x !== v) }),
    })
  }
  for (const m of f.makers || []) {
    chips.push({
      key: `m:${m}`, label: m,
      remove: (cur) => ({ ...cur, makers: cur.makers.filter(x => x !== m) }),
    })
  }
  for (const r of f.regions || []) {
    chips.push({
      key: `r:${r}`, label: r,
      remove: (cur) => ({ ...cur, regions: cur.regions.filter(x => x !== r) }),
    })
  }
  for (const c of f.certifications || []) {
    chips.push({
      key: `cert:${c}`, label: c,
      remove: (cur) => ({ ...cur, certifications: cur.certifications.filter(x => x !== c) }),
    })
  }
  return chips
}
