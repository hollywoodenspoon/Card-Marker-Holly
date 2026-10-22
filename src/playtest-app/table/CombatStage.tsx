import { Eye, EyeOff } from '@/ui/icons'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { seenBy } from '@/playtest/actions'
import { Button } from '@/ui/components/ui/button'
import { PieceFace } from './Piece'
import { usePack } from './packContext'
import type { Stage, StageGroup } from './stage'
import { usePlaytest } from './usePlaytest'

/** The largest a stage card is drawn (px wide). */
const MAX_CARD_PX = 190
/** Room between the two stacks, for the totals (in card widths). */
const MIDDLE = 0.9

/**
 * The Engagement in the middle of the table: each side's counting cards
 * stacked so their swords or shields can be counted, with the totals between.
 */
export function CombatStage({
  stage,
  onPreview,
}: {
  stage: Stage
  onPreview: (pieceId: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [hidden, setHidden] = useState(false)
  const setup = usePlaytest((s) => s.setup)!
  const state = usePlaytest((s) => s.state)!
  const viewer = usePlaytest((s) => s.viewer)
  const pack = usePack()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const size = pack.info.cardSize
  const cw = Math.min(size.w, size.h)
  const { atk, def, totals, attacker } = stage
  // Side by side on a wide screen; on a tall one, the attacker on their own side.
  const wide = box.w >= box.h
  const groupsW = wide ? atk.w + def.w + MIDDLE * cw : Math.max(atk.w, def.w)
  const groupsH = wide ? Math.max(atk.h, def.h) : atk.h + def.h + MIDDLE * cw * 0.6
  const k = Math.min(
    (box.w * 0.94) / groupsW,
    (box.h * (wide ? 0.72 : 0.82)) / groupsH,
    MAX_CARD_PX / cw,
  )
  const name = (seat: 0 | 1) => stage.names[seat]
  const color = (seat: number) => setup.seats[seat]?.color ?? '#64748b'
  const fsAtk = totals.attack - totals.baseAttack
  const fsDef = totals.defense - totals.baseDefense
  // Player 1 sits at the bottom of the table: on a tall screen, their stack goes below.
  const atkFirst = wide || attacker === 1

  const groupView = (g: StageGroup, label: string, total: number, fs: number) => (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white">
        <span className="size-2 rounded-full" style={{ background: color(g.seat) }} />
        {name(g.seat)}: {label} <span className="tabular-nums">{total}</span>
        {fs > 0 && <span className="font-normal text-white/75">(+{fs} FS)</span>}
      </div>
      <div className="relative" style={{ width: g.w * k, height: Math.max(g.h, 1) * k }}>
        {g.cards.length === 0 && (
          <span className="absolute inset-0 grid place-items-center text-xs text-white/80">
            No defender
          </span>
        )}
        {g.cards.map((c) => {
          const p = state.pieces[c.id]
          if (!p) return null
          const f = pack.faces[p.cardId]
          const turned = c.rotation !== 0
          const w = cw * k
          const h = Math.max(size.w, size.h) * k
          const seen = seenBy(setup, state, c.id, viewer)
          return (
            <button
              key={c.id}
              type="button"
              className="absolute rounded-[5%] shadow-lg ring-1 ring-black/40"
              style={{
                left: c.cx * k - w / 2,
                top: c.cy * k - h / 2,
                width: w,
                height: h,
                transform: turned ? `rotate(${c.rotation}deg)` : undefined,
                zIndex: c.z,
              }}
              onClick={() => seen !== 'back' && onPreview(c.id)}
              aria-label={seen === 'back' ? 'A face-down card' : p.name}
              data-stage={c.kind}
            >
              <PieceFace
                piece={p}
                face={f}
                seen={seen === 'back' ? 'back' : 'face'}
                color={color(p.owner)}
              />
              {c.value !== undefined && (
                <span className="absolute -top-2 -right-2 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-black tabular-nums shadow">
                  +{c.value}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  const a = groupView(atk, 'Attack', totals.attack, fsAtk)
  const d = groupView(def, 'Defense', totals.defense, fsDef)
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-x-0 top-[5.5rem] bottom-0 z-[320] sm:top-28"
      data-testid="combat-stage"
    >
      <div className="pointer-events-auto absolute top-2 right-2 z-10">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setHidden((h) => !h)}
          aria-pressed={!hidden}
          data-testid="stage-toggle"
        >
          {hidden ? <Eye /> : <EyeOff />} {hidden ? 'Show stage' : 'Hide stage'}
        </Button>
      </div>
      {!hidden && box.w > 0 && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-3 rounded-t-xl bg-canvas/90 backdrop-blur-sm',
            wide ? 'flex-row' : 'flex-col',
          )}
        >
          <div className="pointer-events-auto">{atkFirst ? a : d}</div>
          <div
            className="rounded-lg bg-black/70 px-3 py-1.5 text-center text-white shadow-lg"
            data-testid="stage-totals"
          >
            <div className="text-lg font-bold tabular-nums sm:text-2xl">
              {totals.attack} <span className="text-sm font-normal text-white/70">vs</span>{' '}
              {totals.defense}
            </div>
            <div className="text-[11px] text-white/75">Attack vs Defense</div>
          </div>
          <div className="pointer-events-auto">{atkFirst ? d : a}</div>
        </div>
      )}
    </div>
  )
}
