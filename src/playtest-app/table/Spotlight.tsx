import { abilityText } from '@/adventure/cards'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { PieceFace } from './Piece'
import { optionPiece } from './rulesPlay'
import { spotlight, type TargetLine } from './spotlight'
import { usePack } from './packContext'
import { SPEED_MS, shownBefore, shownRules, usePlaytest } from './usePlaytest'

/** The activation card's width (px). */
const CARD_PX = 200

/**
 * Card game app moments over the table: a banner when a phase or an Engagement
 * starts, the card of an ability zooming up as it activates, and a line from an
 * ability's card to the card it targets (also while you pick one). Shown while
 * actions play back; nothing in Rush.
 */
export function Spotlight() {
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const rules = usePlaytest((s) => s.rules)
  const choice = usePlaytest((s) => s.choice)
  const speed = usePlaytest((s) => s.speed)
  const playing = usePlaytest((s) => !!s.playback || !!s.replay)
  const shown = usePlaytest(shownRules)
  const before = usePlaytest(shownBefore)
  const pack = usePack()
  const bots = usePlaytest((s) => s.bots)
  // Against a bot: the person's seat, for a "Your turn" banner.
  const human = bots[0] && !bots[1] ? 1 : !bots[0] && bots[1] ? 0 : undefined
  const spot = useMemo(
    () => (playing && shown && before ? spotlight(before, shown, human) : null),
    [playing, shown, before, human],
  )
  // While a card is marked for a choice: a line from the ability's card to it.
  const live = useMemo<TargetLine | null>(() => {
    if (playing || !rules?.pending || rules.step.k !== 'choose' || !choice) return null
    const to = optionPiece(rules, choice)
    const from = `s${rules.pending.ctx.owner}-${rules.pending.source}`
    return to && to !== from ? { from, to } : null
  }, [playing, rules, choice])
  const target = spot?.target ?? live

  const ref = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  useLayoutEffect(() => {
    const root = ref.current?.parentElement
    if (!root || !target) return setLine(null)
    // A card on the combat stage is the one in sight; else its place on the table.
    const at = (id: string) =>
      root.querySelector(`[data-stage][data-hover-piece="${id}"]`) ??
      root.querySelector(`[data-piece="${id}"]`)
    const a = at(target.from)?.getBoundingClientRect()
    const b = at(target.to)?.getBoundingClientRect()
    const r = root.getBoundingClientRect()
    if (!a || !b) return setLine(null)
    setLine({
      x1: a.left + a.width / 2 - r.left,
      y1: a.top + a.height / 2 - r.top,
      x2: b.left + b.width / 2 - r.left,
      y2: b.top + b.height / 2 - r.top,
    })
  }, [target, state])

  if (!setup || !state || speed === 'rush') return null
  const ms = { ['--hs-ms' as string]: `${Math.max(700, SPEED_MS[speed] * 0.95)}ms` }
  const frame = shown?.log.length ?? 0
  const act = spot?.activation
  const actPiece = act ? state.pieces[act.piece] : undefined
  const face = actPiece ? pack.faces[actPiece.cardId] : undefined
  const size = face ?? pack.info.cardSize
  const actH = (CARD_PX * Math.max(size.w, size.h)) / Math.min(size.w, size.h)

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-[340] overflow-hidden">
      {line && (
        <svg className="absolute inset-0 size-full overflow-visible" data-testid="target-line">
          <defs>
            <marker
              id="hs-target"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0 0L10 5L0 10z" fill="#facc15" />
            </marker>
          </defs>
          <line
            {...line}
            stroke="black"
            strokeOpacity="0.45"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <line
            {...line}
            className="hs-dash"
            stroke="#facc15"
            strokeWidth="4"
            strokeDasharray="10 14"
            strokeLinecap="round"
            markerEnd="url(#hs-target)"
          />
          <circle cx={line.x2} cy={line.y2} r="16" fill="none" stroke="#facc15" strokeWidth="3" />
        </svg>
      )}
      {spot?.banner && (
        <div
          key={`b${frame}`}
          className="hs-banner absolute inset-x-0 top-1/3 flex flex-col items-center bg-gradient-to-r from-transparent via-black/90 to-transparent py-4 text-white [text-shadow:0_0_2px_black,0_2px_10px_black]"
          style={ms}
          data-testid="phase-banner"
        >
          <span className="text-3xl font-black tracking-wide uppercase drop-shadow sm:text-5xl">
            {spot.banner.text}
          </span>
          {spot.banner.sub && (
            <span className="text-sm font-semibold text-white/80 sm:text-base">
              {spot.banner.sub}
            </span>
          )}
        </div>
      )}
      {act && actPiece && (
        <div
          key={`a${frame}`}
          className="hs-activate absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
          style={ms}
          data-testid="activation"
        >
          <div
            className="overflow-hidden rounded-xl shadow-[0_0_40px_rgba(250,204,21,0.7)] ring-4 ring-amber-300"
            style={{ width: CARD_PX, height: actH }}
          >
            <PieceFace
              piece={actPiece}
              face={face}
              seen="face"
              color={setup.seats[actPiece.owner]?.color ?? '#64748b'}
            />
          </div>
          <div className="max-w-xs rounded-lg bg-black/80 px-3 py-1.5 text-center text-white shadow-lg">
            <div className="text-xs font-semibold tracking-wide text-amber-300 uppercase">
              {act.how}
            </div>
            <div className="text-sm font-bold">{rules?.cards[act.card]?.name}</div>
            <div className="line-clamp-3 text-xs text-white/85">
              {abilityText(rules?.cards[act.card]?.ability ?? '')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
