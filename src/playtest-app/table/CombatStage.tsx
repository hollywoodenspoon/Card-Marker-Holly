import { Eye, EyeOff } from '@/ui/icons'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { seenBy } from '@/playtest/actions'
import { Button } from '@/ui/components/ui/button'
import { pieceId } from '@/adventure/table'
import { PieceFace, TokenShape } from './Piece'
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
  const hidden = usePlaytest((s) => s.stageHidden)
  const setHidden = (f: (h: boolean) => boolean) =>
    usePlaytest.setState((s) => ({ stageHidden: f(s.stageHidden) }))
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
    (box.h * (wide ? 0.72 : 0.74)) / groupsH,
    MAX_CARD_PX / cw,
  )
  const name = (seat: 0 | 1) => stage.names[seat]
  const color = (seat: number) => setup.seats[seat]?.color ?? '#64748b'
  // A change to a total pops up next to it as +N (or −N).
  const [last, setLast] = useState({ attacker, attack: totals.attack, defense: totals.defense })
  const [pops, setPops] = useState<{ id: number; side: 'atk' | 'def'; n: number }[]>([])
  if (
    last.attacker !== attacker ||
    last.attack !== totals.attack ||
    last.defense !== totals.defense
  ) {
    const same = last.attacker === attacker
    const add = same
      ? [
          { side: 'atk' as const, n: totals.attack - last.attack },
          { side: 'def' as const, n: totals.defense - last.defense },
        ].filter((x) => x.n !== 0)
      : []
    const base = pops.at(-1)?.id ?? 0
    setLast({ attacker, attack: totals.attack, defense: totals.defense })
    setPops(same ? [...pops, ...add.map((x, i) => ({ ...x, id: base + i + 1 }))].slice(-4) : [])
  }
  const popsFor = (side: 'atk' | 'def') =>
    pops
      .filter((p) => p.side === side)
      .map((p) => (
        <span
          key={p.id}
          className={cn(
            'hs-float pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-lg font-black drop-shadow',
            p.n > 0 ? 'text-amber-300' : 'text-red-400',
          )}
          data-testid="stage-pop"
        >
          {p.n > 0 ? `+${p.n}` : `−${-p.n}`}
        </span>
      ))
  const fsAtk = totals.attack - totals.baseAttack
  const fsDef = totals.defense - totals.baseDefense
  // Player 1 sits at the bottom of the table: on a tall screen, their stack goes below.
  const atkFirst = wide || attacker === 1

  const restStrip = (seat: 0 | 1) =>
    stage.rest[seat].length > 0 && (
      <div
        className="flex items-center gap-1 rounded-md bg-amber-500/25 px-1.5 py-1 ring-1 ring-amber-400/70"
        data-testid="stage-rest"
        title="Rest-zone cards this player can still use for Fighting Spirit in this Engagement"
      >
        <span className="text-[10px] leading-tight font-semibold text-amber-100">
          Rest zone
          <br />
          ready
        </span>
        {stage.rest[seat].map((r) => {
          const p = state.pieces[r.id]
          if (!p) return null
          const f = pack.faces[p.cardId]
          return (
            <button
              key={r.id}
              type="button"
              className="relative h-10 shrink-0 overflow-hidden rounded ring-1 ring-amber-300 sm:h-14"
              style={{ aspectRatio: `${cw} / ${Math.max(size.w, size.h)}` }}
              onClick={() => onPreview(r.id)}
              data-hover-piece={r.id}
              aria-label={`${p.name} in the rest zone, +${r.value ?? '?'}`}
            >
              <PieceFace piece={p} face={f} seen="face" color={color(p.owner)} />
              <span className="absolute inset-x-0 bottom-0 bg-amber-500 text-center text-[10px] font-bold text-black">
                {r.value === null ? 'coin' : `+${r.value}`}
              </span>
            </button>
          )
        })}
      </div>
    )
  const groupView = (g: StageGroup, label: string, total: number, fs: number) => (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'relative flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-semibold text-white',
          stage.turn === g.seat && 'ring-2 ring-amber-300',
        )}
      >
        {popsFor(label === 'Attack' ? 'atk' : 'def')}
        {stage.turn === g.seat && (
          <span className="text-amber-300 motion-safe:animate-pulse" aria-label="Their turn">
            ▶
          </span>
        )}
        <span className="size-2 rounded-full" style={{ background: color(g.seat) }} />
        {name(g.seat)}: {label} <span className="tabular-nums">{total}</span>
        {fs > 0 && <span className="font-normal text-white/75">(+{fs} FS)</span>}
        <span className="font-normal text-white/75" data-testid="stage-hand-count">
          · Hand {stage.hand[g.seat]}
        </span>
        {stage.passed[g.seat] && (
          <span className="rounded bg-white/85 px-1 text-[10px] font-bold text-black uppercase">
            Passed
          </span>
        )}
      </div>
      {restStrip(g.seat)}
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
          const cube = c.kind === 'main' && setup.tokens.find((t) => t.id === 'main-attacker')
          return [
            // The Main Attacker cube sits on its card's top strip, which always shows.
            cube && (
              <span
                key={`${c.id}:main`}
                className="pointer-events-none absolute"
                style={{
                  left: c.cx * k - (turned ? h : w) / 2 + 4,
                  top: c.cy * k - (turned ? w : h) / 2 + 4,
                  zIndex: 90,
                }}
                title="Main Attacker"
                data-testid="stage-main-cube"
              >
                <TokenShape def={cube} color={color(p.owner)} px={Math.max(16, 0.16 * w)} />
              </span>
            ),
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
              data-hover-piece={seen !== 'back' ? c.id : undefined}
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
              {c.fromRest && (
                <span className="absolute -top-2 left-1 rounded-full bg-slate-800 px-1.5 text-[10px] font-semibold text-amber-200 shadow ring-1 ring-amber-300">
                  from rest zone
                </span>
              )}
            </button>,
          ]
        })}
      </div>
    </div>
  )

  // Your hand stays in reach while the stage is up, as in a card game app.
  const rules = usePlaytest((s) => s.rules)
  const bots = usePlaytest((s) => s.bots)
  const handSeat: 0 | 1 =
    viewer === 0 || viewer === 1
      ? viewer
      : bots[0] && !bots[1]
        ? 1
        : !bots[0] && bots[1]
          ? 0
          : rules?.step.k === 'fs'
            ? rules.step.seat
            : attacker
  const hand = (rules?.players[handSeat].support ?? []).map((c) => pieceId(handSeat, c))
  const handView = hand.length > 0 && (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-1 flex justify-center"
      data-testid="stage-hand"
    >
      <div className="flex max-w-full items-end gap-1 overflow-x-auto rounded-t-lg bg-black/55 px-2 pt-1 pb-1.5">
        <span className="mr-1 self-center text-[11px] font-semibold text-white/80">
          {name(handSeat)}'s Support
        </span>
        {hand.map((id) => {
          const p = state.pieces[id]
          if (!p) return null
          const f = pack.faces[p.cardId]
          const seen = seenBy(setup, state, id, viewer)
          return (
            <button
              key={id}
              type="button"
              className="h-16 shrink-0 overflow-hidden rounded-md shadow ring-1 ring-white/30 transition-transform hover:-translate-y-1 sm:h-24"
              style={{ aspectRatio: `${cw} / ${Math.max(size.w, size.h)}` }}
              onClick={() => seen !== 'back' && onPreview(id)}
              data-hover-piece={seen !== 'back' ? id : undefined}
              aria-label={seen === 'back' ? 'A face-down card' : p.name}
            >
              <PieceFace
                piece={p}
                face={f}
                seen={seen === 'back' ? 'back' : 'face'}
                color={color(p.owner)}
              />
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
          aria-label={hidden ? 'Show stage' : 'Hide stage'}
          data-testid="stage-toggle"
        >
          {hidden ? <Eye /> : <EyeOff />}
          {/* Just the icon on a phone, clear of the stack's label. */}
          <span className="hidden sm:inline">{hidden ? 'Show stage' : 'Hide stage'}</span>
        </Button>
      </div>
      {!hidden && box.w > 0 && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center gap-3 rounded-t-xl pt-12 pb-20 sm:pt-0 sm:pb-28 bg-canvas/90 backdrop-blur-sm',
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
      {!hidden && handView}
    </div>
  )
}
