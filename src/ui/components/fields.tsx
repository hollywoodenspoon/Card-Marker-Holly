import { useState } from 'react'
import { fromDisplay, toDisplay, unitPrecision } from '@/core/units/units'
import { cn } from '@/lib/cn'
import { Label } from './ui/input'
import { useUnits } from './useUnits'

/**
 * Numeric input that commits as you type (valid numbers only) and on blur.
 * Arrow keys step by `step` (×10 with Shift).
 *
 * `unit="mm"` marks a length: the value (always mm) is shown and typed in the
 * project's display unit (mm, cm, in or px), converting both ways.
 */
export function NumberField(props: Parameters<typeof PlainNumberField>[0]) {
  const units = useUnits()
  if (props.unit !== 'mm' || units.unit === 'mm') return <PlainNumberField {...props} />
  const conv = (v: number | undefined) => (v === undefined ? undefined : toDisplay(v, units))
  const { precision, step } = unitPrecision(units.unit)
  return (
    <PlainNumberField
      {...props}
      unit={units.unit}
      value={toDisplay(props.value, units)}
      min={conv(props.min)}
      max={conv(props.max)}
      step={step}
      precision={precision}
      onChange={(v) => props.onChange(fromDisplay(v, units))}
    />
  )
}

function PlainNumberField({
  label,
  value,
  onChange,
  unit,
  step = 0.1,
  min,
  max,
  precision = 2,
  disabled,
  className,
  id,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  unit?: string
  step?: number
  min?: number
  max?: number
  precision?: number
  disabled?: boolean
  className?: string
  id?: string
}) {
  const shown = formatNum(value, precision)
  // null while not focused, so the field follows external changes.
  const [draft, setDraft] = useState<string | null>(null)
  const clampV = (v: number) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v))
  const inputId = id ?? `nf-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex h-11 items-center rounded-md border border-input bg-panel focus-within:border-accent md:h-8">
        <input
          id={inputId}
          inputMode="decimal"
          disabled={disabled}
          value={draft ?? shown}
          onFocus={(e) => {
            setDraft(shown)
            e.currentTarget.select()
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            const v = parseFloat(e.target.value.replace(',', '.'))
            if (Number.isFinite(v)) onChange(clampV(v))
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault()
              const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1)
              const v = clampV(round(value + d, precision))
              onChange(v)
              setDraft(formatNum(v, precision))
            }
          }}
          className="h-full w-full min-w-0 bg-transparent px-2 text-base tabular-nums outline-none disabled:opacity-50 md:text-sm"
        />
        {unit && <span className="pr-2 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  )
}

const round = (v: number, p: number) => Math.round(v * 10 ** p) / 10 ** p
const formatNum = (v: number, p: number) => String(round(v, p))

/** Colour swatch + hex input; `allowNone` adds a "no colour" toggle. */
export function ColorField({
  label,
  value,
  onChange,
  allowNone,
  disabled,
}: {
  label: string
  value: string | null
  onChange: (v: string | null) => void
  allowNone?: boolean
  disabled?: boolean
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const id = `cf-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex h-11 items-center gap-1.5 rounded-md border border-input bg-panel px-1.5 md:h-8">
        <label
          className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded border md:size-5"
          style={{
            background: value ?? 'repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 50% / 8px 8px',
          }}
        >
          <input
            type="color"
            aria-label={`${label} picker`}
            disabled={disabled}
            value={value ?? '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <input
          id={id}
          disabled={disabled}
          value={draft ?? value ?? 'none'}
          onFocus={(e) => {
            setDraft(value ?? '')
            e.currentTarget.select()
          }}
          onChange={(e) => {
            setDraft(e.target.value)
            const v = normaliseHex(e.target.value)
            if (v) onChange(v)
          }}
          onBlur={() => setDraft(null)}
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none md:text-xs"
        />
        {allowNone && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(value ? null : '#000000')}
            className="h-9 shrink-0 rounded px-1.5 text-xs text-muted-foreground hover:bg-muted md:h-6"
          >
            {value ? 'None' : 'Add'}
          </button>
        )}
      </div>
    </div>
  )
}

function normaliseHex(v: string): string | null {
  const s = v.trim().replace(/^#/, '')
  if (/^[0-9a-f]{6}$/i.test(s)) return '#' + s.toLowerCase()
  if (/^[0-9a-f]{3}$/i.test(s))
    return (
      '#' +
      s
        .split('')
        .map((c) => c + c)
        .join('')
        .toLowerCase()
    )
  return null
}

export function Section({
  title,
  children,
  action,
}: {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <section className="border-b px-4 py-3 last:border-b-0">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        {action}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

export function Row({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        'grid gap-2',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-3',
        cols === 4 && 'grid-cols-4',
      )}
    >
      {children}
    </div>
  )
}
