import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronRight, CircleHelp, FastForward, Undo2 } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { cn } from '@/lib/cn'
import { botMove, type UwLevel } from '@/urban/bot'
import { cardsFromPack, deal, missingKinds } from '@/urban/cards'
import { apply, createGame, legalMoves, step, strength } from '@/urban/engine'
import {
  CENTER,
  HOLD_TURNS,
  KINDS,
  KIND_NAME,
  PER_PLAYER,
  type Dir,
  type Seat,
  type UwCard,
  type UwMove,
  type UwRules,
  type UwState,
} from '@/urban/state'
import { saveUrbanReplay } from '@/playtest/library'
import type { UwReplay } from '@/urban/replay'
import { usePack } from '../table/packContext'
import { UrbanReplays } from './UrbanReplays'
import { UrbanSim } from './UrbanSim'
import { UrbanRules } from './UrbanRules'
import { SPEED_MS, usePlaytest } from '../table/usePlaytest'
import { useUrbanMotion } from './useUrbanMotion'

/** Urban Warfare at the Table: hot-seat or against a bot. Rules run in `src/urban/`. */

type Mode = 'hotseat' | UwLevel | 'bots'
type Screen = 'table' | 'replays' | 'sim'
type Pick = { hand: UwCard } | { zone: number } | null
type Shown = { from: UwState; to: UwState; lines: string[]; i: number; dir: Dir | null }

const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' }
/** Arrow buttons sit just inside the zone's edge, so they never cover a neighbour. */
const ARROW_POS: Record<Dir, string> = {
  up: 'left-1/2 top-1 -translate-x-1/2',
  down: 'left-1/2 bottom-1 -translate-x-1/2',
  left: 'left-1 top-1/2 -translate-y-1/2',
  right: 'right-1 top-1/2 -translate-y-1/2',
}
/** Taps on arrows this soon after they appear are ignored (a double tap must not play a move). */
const ARROW_GUARD_MS = 350
const SEAT_RING = ['ring-sky-500', 'ring-rose-500']
const SEAT_TEXT = ['text-sky-600 dark:text-sky-400', 'text-rose-600 dark:text-rose-400']

export function UrbanView({
  phone,
  onBack,
  onHelp,
}: {
  phone: boolean
  onBack: () => void
  onHelp: () => void
}) {
  const pack = usePack()
  const read = useMemo(() => cardsFromPack(pack.info.cards), [pack])
  const missing = missingKinds(read.cards)
  const [mode, setMode] = useState<Mode>('normal')
  const [botLevels, setBotLevels] = useState<[UwLevel, UwLevel]>(['normal', 'normal'])
  const [rules, setRules] = useState<UwRules>({})
  const [screen, setScreen] = useState<Screen>('table')
  const [history, setHistory] = useState<UwState[]>([])
  /** Moves between the states in `history` (one fewer), for the replay. */
  const [moves, setMoves] = useState<UwMove[]>([])
  /** A replay being watched: no input, play/pause/step instead. */
  const [watch, setWatch] = useState<{ r: UwReplay; playing: boolean } | null>(null)
  const [paused, setPaused] = useState(false)
  /** The last change was a replay jump: no card motion. */
  const [jumped, setJumped] = useState(false)
  const [pick, setPick] = useState<Pick>(null)
  const [handoff, setHandoff] = useState(false)
  /** The move being shown, one log line at a time; nothing else happens until it ends. */
  const [shown, setShown] = useState<Shown | null>(null)
  /** "Your turn" and the like, shown big between turns. */
  const [turnBanner, setTurnBanner] = useState<string | null>(null)
  const speed = usePlaytest((x) => x.speed)
  const rush = speed === 'rush'
  const rootRef = useRef<HTMLDivElement>(null)
  const pickedAt = useRef(0)
  const choose = (p: Pick, at: number) => {
    setPick(p)
    pickedAt.current = at
  }
  const s = history[history.length - 1]
  const prev = history[history.length - 2]

  useUrbanMotion(
    rootRef,
    history.length,
    shown?.dir ?? null,
    rush || jumped,
    !!shown?.lines[0]?.includes(' bombs '),
  )

  const start = () => {
    const first = (Math.random() < 0.5 ? 0 : 1) as Seat
    setHistory([createGame(deal(read.cards), first, rules)])
    setMoves([])
    setWatch(null)
    setPaused(false)
    setTurnBanner(
      mode === 'hotseat' || mode === 'bots'
        ? `Player ${first + 1} goes first`
        : first === 0
          ? 'You go first'
          : 'The bot goes first',
    )
    setPick(null)
    setShown(null)
    setTurnBanner(null)
    setHandoff(mode === 'hotseat')
  }

  const bots: [UwLevel | null, UwLevel | null] = watch
    ? watch.r.bots
    : mode === 'hotseat'
      ? [null, null]
      : mode === 'bots'
        ? botLevels
        : [null, mode]
  const allBots = !!watch || (bots[0] !== null && bots[1] !== null)
  /** The seat a bot plays against a person, else null. */
  const botSeat: Seat | null = allBots ? null : bots[1] !== null ? 1 : null
  const viewer: Seat = !s ? 0 : allBots ? 0 : botSeat === null ? s.turn : 0

  const play = (m: UwMove) => {
    if (!s) return
    setPick(null)
    played(s, m)
  }

  const played = (from: UwState, m: UwMove) => {
    const n = apply(from, m)
    setJumped(false)
    setHistory((h) => [...h, n])
    if (!watch) {
      const all = [...moves, m]
      setMoves(all)
      if (n.winner !== null) keep(history[0], all, n)
    }
    const lines = n.log.slice(from.log.length)
    if (rush) return finish(from, n)
    setShown({ from, to: n, lines, i: 0, dir: 'dir' in m && m.dir ? m.dir : null })
  }

  const keep = (start: UwState, all: UwMove[], end: UwState) =>
    void saveUrbanReplay({
      packId: pack.info.projectId,
      bots,
      winner: end.winner,
      reason: end.reason,
      start,
      moves: all,
    })

  const who = (seat: Seat) =>
    allBots
      ? `Bot ${seat + 1}`
      : botSeat !== null
        ? seat === botSeat
          ? 'The bot'
          : 'You'
        : `Player ${seat + 1}`

  // The move has been shown: say whose turn it is, then the next player may act.
  const finish = (from: UwState, to: UwState) => {
    setShown(null)
    if (to.winner !== null) return
    if (to.turn === from.turn) return
    const name = who(to.turn)
    setTurnBanner(name === 'You' ? 'Your turn' : `${name}'s turn`)
    if (mode === 'hotseat' && !watch) setHandoff(true)
  }

  const next = () => {
    if (!shown) return
    if (shown.i + 1 < shown.lines.length) setShown({ ...shown, i: shown.i + 1 })
    else finish(shown.from, shown.to)
  }

  // Each line stays up for the Action speed, or until Next.
  useEffect(() => {
    if (!shown) return
    const t = setTimeout(next, SPEED_MS[speed] + (shown.i === 0 ? 500 : 0))
    return () => clearTimeout(t)
  })

  useEffect(() => {
    if (!turnBanner) return
    const t = setTimeout(() => setTurnBanner(null), 1400)
    return () => clearTimeout(t)
  }, [turnBanner])

  // The bot's turn, or the replay's next move.
  useEffect(() => {
    if (!s || shown || turnBanner || s.winner !== null || paused) return
    if (watch) {
      const m = watch.r.moves[history.length - 1]
      if (!watch.playing || !m) return
      const t = setTimeout(() => played(s, m), rush ? 0 : 600)
      return () => clearTimeout(t)
    }
    const level = bots[s.turn]
    if (!level) return
    const t = setTimeout(() => played(s, botMove(s, level)), rush ? 0 : 900)
    return () => clearTimeout(t)
  })

  /** Replay: one move forward or back, or jump to move `i`. */
  const seek = (i: number) => {
    if (!watch) return
    let h = [watch.r.start]
    for (const m of watch.r.moves.slice(0, i)) h = [...h, apply(h[h.length - 1], m)]
    setShown(null)
    setTurnBanner(null)
    setJumped(true)
    setHistory(h)
  }
  const openReplay = (r: UwReplay) => {
    setWatch({ r, playing: false })
    setHistory([r.start])
    setMoves([])
    setShown(null)
    setTurnBanner(null)
    setHandoff(false)
    setPick(null)
    setScreen('table')
  }

  const undo = () => {
    setPick(null)
    setShown(null)
    setTurnBanner(null)
    setHistory((h) => {
      if (h.length <= 1) return h
      let i = h.length - 2
      // Against a bot, go back to your own turn.
      if (botSeat !== null) while (i > 0 && h[i].turn === botSeat) i--
      return h.slice(0, i + 1)
    })
  }

  const header = (
    <div className="flex items-center gap-2 border-b bg-panel px-2 py-1">
      <IconButton label="Back to the library" onClick={onBack}>
        <ArrowLeft />
      </IconButton>
      <h1 className="flex-1 truncate text-sm font-semibold">Urban Warfare · {pack.info.name}</h1>
      {s && !watch && (
        <IconButton label="Undo" onClick={undo} disabled={history.length <= 1}>
          <Undo2 />
        </IconButton>
      )}
      <IconButton label="How to play" onClick={onHelp}>
        <CircleHelp />
      </IconButton>
    </div>
  )

  if (screen === 'replays')
    return (
      <div className="flex h-full flex-col bg-canvas">
        {header}
        <UrbanReplays
          packId={pack.info.projectId}
          onOpen={openReplay}
          onClose={() => setScreen('table')}
        />
      </div>
    )
  if (screen === 'sim')
    return (
      <div className="flex h-full flex-col bg-canvas">
        {header}
        <UrbanSim
          cards={read.cards}
          rules={rules}
          onRules={setRules}
          onClose={() => setScreen('table')}
        />
      </div>
    )

  if (!s)
    return (
      <div className="flex h-full flex-col bg-canvas">
        {header}
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 p-4">
          <p className="text-sm text-muted-foreground">
            Each player gets 3 Battleline Mech, 2 Advanced Mech, 2 Logistics Mech and 2
            Fighter-Bomber. Who goes first is random.
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Players
            <select
              className="h-11 rounded-md border bg-panel px-2 md:h-9"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
            >
              <option value="normal">You against the bot (Normal)</option>
              <option value="easy">You against the bot (Easy)</option>
              <option value="hotseat">Two players, one device</option>
              <option value="bots">Bot against bot (watch)</option>
            </select>
          </label>
          {mode === 'bots' && (
            <div className="flex gap-2">
              {([0, 1] as Seat[]).map((seat) => (
                <label key={seat} className="flex flex-1 flex-col gap-1 text-sm">
                  Bot {seat + 1}
                  <select
                    className="h-11 rounded-md border bg-panel px-2 md:h-9"
                    value={botLevels[seat]}
                    onChange={(e) => {
                      const v = e.target.value as UwLevel
                      setBotLevels((b) => (seat === 0 ? [v, b[1]] : [b[0], v]))
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="easy">Easy</option>
                  </select>
                </label>
              ))}
            </div>
          )}
          <UrbanRules rules={rules} onChange={setRules} />
          {read.issues.length > 0 && (
            <ul className="rounded-md border p-2 text-xs text-danger">
              {read.issues.map((i, k) => (
                <li key={k}>
                  {i.name}: {i.problem}
                </li>
              ))}
            </ul>
          )}
          <Button onClick={start} disabled={missing.length > 0}>
            Start
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setScreen('replays')}>
              Replays
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setScreen('sim')}
              disabled={missing.length > 0}
            >
              Simulation
            </Button>
          </div>
        </div>
      </div>
    )

  const busy = !!shown || !!turnBanner
  const legal = s.winner === null && !allBots && s.turn !== botSeat && !busy ? legalMoves(s) : []
  // The move being shown: who made it, and the cards it took off the field.
  const mover = shown ? shown.from.turn : s.turn
  const onField = new Set(s.field.flatMap((p) => (p ? [p.card.id] : [])))
  const lost = shown ? shown.from.field.filter((p) => p && !onField.has(p.card.id)) : []
  const line = shown?.lines[shown.i] ?? ''
  const lineLost = /off the field|destroy|bomb/i.test(line) ? lost : []
  const field = s.field
  const myHand = s.hands[viewer]
  const opp = (1 - viewer) as Seat

  // Moves for the current pick.
  const sameCard = (m: UwMove, c: UwCard) => {
    if (m.type === 'bomb') return c.kind === 'bomb'
    if (m.type !== 'place') return false
    const mc = s.hands[s.turn].find((x) => x.id === m.card)
    return !!mc && mc.kind === c.kind && mc.fp === c.fp
  }
  const pickMoves =
    pick && 'hand' in pick
      ? legal
          .filter((m) => sameCard(m, pick.hand))
          .map((m) => (m.type === 'place' || m.type === 'bomb' ? { ...m, card: pick.hand.id } : m))
      : pick && 'zone' in pick
        ? legal.filter((m) => m.type === 'move' && m.from === pick.zone)
        : []
  // Zones to tap: empty zones a hand card can go to, or enemy cards a Fighter-Bomber can hit.
  const zoneTargets = (z: number) =>
    pickMoves.filter(
      (m) =>
        (m.type === 'place' && m.zone === z && !m.dir) || (m.type === 'bomb' && m.target === z),
    )
  // Arrows on a zone's edges: moves of the picked field card, or pushes of the picked hand card.
  const zoneArrows = (z: number): { dir: Dir; move: UwMove }[] =>
    pickMoves.flatMap((m) =>
      m.type === 'move' && m.from === z
        ? [{ dir: m.dir, move: m as UwMove }]
        : m.type === 'place' && m.zone === z && m.dir
          ? [{ dir: m.dir, move: m as UwMove }]
          : [],
    )

  const tapZone = (z: number, at: number) => {
    if (handoff) return
    const t = zoneTargets(z)
    if (t.length === 1) return play(t[0])
    if (zoneArrows(z).length > 0 && pick && 'hand' in pick) return // choose an arrow
    const p = s.field[z]
    if (p && p.owner === s.turn && legal.some((m) => m.type === 'move' && m.from === z))
      choose(pick && 'zone' in pick && pick.zone === z ? null : { zone: z }, at)
    else setPick(null)
  }

  const fieldPick = pick && 'zone' in pick ? pick.zone : null

  const banner =
    s.winner !== null
      ? s.winner === 'draw'
        ? 'Draw.'
        : `Player ${s.winner + 1} wins (${s.reason === 'battleline' ? 'Battleline Victory' : s.reason === 'objective' ? 'Objective Victory' : 'Attrition Victory'}).`
      : shown
        ? `${who(mover)} ${who(mover) === 'You' ? 'play' : 'plays'}…`
        : turnBanner
          ? turnBanner
          : allBots
            ? watch
              ? `Replay, move ${history.length - 1} of ${watch.r.moves.length}`
              : `Bot ${s.turn + 1} is thinking…`
            : s.turn === botSeat
              ? 'The bot is thinking…'
              : `Player ${s.turn + 1}: ${s.placementsLeft === 2 ? 'place 2 cards' : s.turnsTaken[s.turn] === 0 ? 'place a card' : 'place, move, bomb or pass'}.`

  const hold = s.centerHold
  // Zones the last move changed, so a bot move never looks like a jump.
  const changed = (z: number) => !!prev && prev.field[z] !== s.field[z]
  const cell = phone ? 'w-[22vw] max-w-28' : 'w-32'

  return (
    <div ref={rootRef} className="flex h-full flex-col bg-canvas">
      {header}
      <div className="flex flex-1 flex-col items-center gap-3 overflow-auto p-3 md:flex-row md:items-start md:justify-center">
        <div className="flex flex-col items-center gap-2">
          <div
            className={cn(
              'rounded-md px-3 py-1 text-sm font-medium',
              s.winner !== null ? 'bg-accent text-accent-foreground' : 'bg-muted',
            )}
          >
            {banner}
          </div>
          <div data-uw-from>
            <OppCounts s={s} seat={opp} />
          </div>
          <div className="flex min-h-16 w-full items-center justify-center">
            {shown && line && (
              <div key={`${shown.i}-${line}`} className="flex justify-center">
                <div
                  className="pointer-events-auto flex max-w-[min(30rem,92vw)] items-center gap-2 rounded-xl border-2 border-amber-500 bg-panel/95 px-3 py-2 shadow-xl backdrop-blur [animation:hs-pop_200ms_ease-out]"
                  role="status"
                  aria-live="polite"
                  data-testid="uw-callout"
                >
                  {lineLost.map((p) => (
                    <CardFace
                      key={p!.card.id}
                      card={p!.card}
                      className={cn(
                        'aspect-[63/88] w-10 shrink-0 rounded ring-2',
                        SEAT_RING[p!.owner],
                      )}
                    />
                  ))}
                  <div className="min-w-0">
                    <p className={cn('text-xs font-semibold', SEAT_TEXT[mover])}>{who(mover)}</p>
                    <p className="text-base leading-snug font-medium">{line}</p>
                  </div>
                  {shown.lines.length > 1 && (
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {shown.i + 1} of {shown.lines.length}
                    </span>
                  )}
                  <Button size="sm" className="shrink-0" onClick={next} data-testid="uw-next">
                    Next <ChevronRight />
                  </Button>
                  {shown.lines.length > 1 && (
                    <IconButton
                      label="Skip"
                      onClick={() => finish(shown.from, shown.to)}
                      data-testid="uw-skip"
                    >
                      <FastForward />
                    </IconButton>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="relative grid grid-cols-3 gap-1.5 p-5">
            {turnBanner && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
                <div
                  className={cn(
                    'rounded-lg px-6 py-3 text-2xl font-bold text-white shadow-2xl [animation:hs-banner_1400ms_ease-in-out_forwards]',
                    s.turn === 0 ? 'bg-sky-600' : 'bg-rose-600',
                  )}
                  data-testid="uw-turn-banner"
                >
                  {turnBanner}
                </div>
              </div>
            )}
            {field.map((p, z) => {
              const target = zoneTargets(z).length > 0
              const bonus = p ? strength(field, z) - p.card.fp : 0
              return (
                <div key={z} className={cn('relative aspect-[63/88]', cell)}>
                  <button
                    type="button"
                    aria-label={`Zone ${z + 1}${p ? `: player ${p.owner + 1}'s ${p.card.name}` : ''}`}
                    onClick={(e) => tapZone(z, e.timeStamp)}
                    className={cn(
                      'h-full w-full rounded-md border bg-panel',
                      z === CENTER && 'border-2 border-amber-500',
                      target &&
                        (p
                          ? 'outline outline-4 outline-red-500'
                          : 'outline outline-4 outline-green-500'),
                      fieldPick === z && 'outline outline-4 outline-amber-500',
                      !target &&
                        fieldPick !== z &&
                        changed(z) &&
                        'outline-dashed outline-2 outline-offset-2 outline-amber-500',
                    )}
                  >
                    {p && (
                      <>
                        <span
                          className="absolute inset-0 block"
                          data-uw-card={p.card.id}
                          data-uw-field="1"
                        >
                          <CardFace
                            card={p.card}
                            className={cn('h-full w-full rounded-md ring-4', SEAT_RING[p.owner])}
                          />
                        </span>
                        <span
                          className={cn(
                            'absolute bottom-1 right-1 rounded px-1.5 text-xs font-bold text-white',
                            bonus > 0 ? 'bg-green-700' : 'bg-black/70',
                          )}
                        >
                          {bonus > 0 ? `${p.card.fp} +${bonus} = ${p.card.fp + bonus}` : p.card.fp}
                        </span>
                        {bonus > 0 && (
                          <span className="absolute left-1 top-1 rounded bg-green-700 px-1.5 text-[10px] font-bold text-white">
                            Buffed
                          </span>
                        )}
                      </>
                    )}
                    {!p && (
                      <span className="text-xs text-muted-foreground">
                        {z === CENTER ? 'Center' : z + 1}
                      </span>
                    )}
                  </button>
                  {zoneArrows(z).map(({ dir, move }) => (
                    <button
                      key={dir}
                      type="button"
                      aria-label={`${move.type === 'move' ? 'Move' : 'Place and push'} ${dir}${move.type === 'move' && step(z, dir) === null ? ' off the field' : ''}`}
                      onClick={(e) => {
                        if (e.timeStamp - pickedAt.current > ARROW_GUARD_MS) play(move)
                      }}
                      className={cn(
                        'absolute z-10 flex size-8 items-center justify-center rounded-full bg-green-600 text-xl font-bold text-white shadow-lg ring-2 ring-white',
                        ARROW_POS[dir],
                        move.type === 'move' && step(z, dir) === null && 'bg-zinc-600',
                      )}
                    >
                      {ARROW[dir]}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Center:{' '}
            {hold ? (
              <span className={SEAT_TEXT[hold.seat]}>
                Player {hold.seat + 1}, {hold.oppTurns}/{HOLD_TURNS} turns held
              </span>
            ) : (
              'nobody'
            )}
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-2">
          <h2 className={cn('text-sm font-semibold', SEAT_TEXT[viewer])}>
            Player {viewer + 1}'s hand ({myHand.length})
          </h2>
          {handoff ? (
            <Button onClick={() => setHandoff(false)}>Player {s.turn + 1}: show my hand</Button>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {myHand.map((c) => {
                const usable = legal.some((m) => sameCard(m, c))
                const picked = pick && 'hand' in pick && pick.hand.id === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={!usable}
                    aria-label={c.name}
                    onClick={(e) => choose(picked ? null : { hand: c }, e.timeStamp)}
                    className={cn(
                      'w-16 rounded-md disabled:opacity-50',
                      picked && 'outline outline-2 outline-amber-500',
                      usable && !picked && 'outline outline-1 outline-green-500',
                    )}
                  >
                    <span className="block" data-uw-card={c.id}>
                      <CardFace card={c} className="aspect-[63/88] w-full rounded-md" />
                    </span>
                  </button>
                )
              })}
            </div>
          )}
          {watch && (
            <div className="flex flex-col gap-2 rounded-md border bg-panel p-2">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setWatch({ ...watch, playing: !watch.playing })}>
                  {watch.playing ? 'Pause' : 'Play'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => seek(history.length - 2)}
                  disabled={history.length <= 1}
                >
                  Back
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => seek(history.length)}
                  disabled={history.length > watch.r.moves.length}
                >
                  Step
                </Button>
              </div>
              <input
                type="range"
                aria-label="Replay position"
                min={0}
                max={watch.r.moves.length}
                value={history.length - 1}
                onChange={(e) => seek(Number(e.target.value))}
              />
            </div>
          )}
          {allBots && !watch && s.winner === null && (
            <Button size="sm" variant="secondary" onClick={() => setPaused(!paused)}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
          )}
          <div className="flex gap-2">
            {legal.some((m) => m.type === 'pass') && !handoff && (
              <Button variant="secondary" size="sm" onClick={() => play({ type: 'pass' })}>
                Pass
              </Button>
            )}
            {(s.winner !== null || watch || allBots) && (
              <Button
                size="sm"
                onClick={() => {
                  setHistory([])
                  setWatch(null)
                  setShown(null)
                }}
              >
                {watch ? 'Close replay' : 'New game'}
              </Button>
            )}
          </div>
          <ol className="max-h-48 overflow-auto rounded-md border bg-panel p-2 text-xs">
            {s.log
              .slice()
              .reverse()
              .map((l, i) => (
                <li key={i}>{l}</li>
              ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function CardFace({ card, className }: { card: UwCard; className?: string }) {
  const face = usePack().faces[card.packId]
  return face?.front ? (
    <img
      src={face.front}
      alt={card.name}
      draggable={false}
      className={cn('object-cover', className)}
    />
  ) : (
    <div
      className={cn(
        'flex items-center justify-center bg-muted p-1 text-center text-[10px]',
        className,
      )}
    >
      {card.name} ({card.fp})
    </div>
  )
}

/** The other player's cards left, by kind (card counting is allowed). */
function OppCounts({ s, seat }: { s: UwState; seat: Seat }) {
  return (
    <p className={cn('text-xs', SEAT_TEXT[seat])}>
      Player {seat + 1} has {s.hands[seat].length} left:{' '}
      {KINDS.map(
        (k) =>
          `${s.hands[seat].filter((c) => c.kind === k).length}/${PER_PLAYER[k]} ${KIND_NAME[k]}`,
      ).join(', ')}
    </p>
  )
}
