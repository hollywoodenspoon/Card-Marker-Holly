import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CircleHelp, Undo2 } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { cn } from '@/lib/cn'
import { botMove, type UwLevel } from '@/urban/bot'
import { cardsFromPack, deal, missingKinds } from '@/urban/cards'
import { apply, createGame, legalMoves, placeDirs, step, strength } from '@/urban/engine'
import {
  CENTER,
  KINDS,
  KIND_NAME,
  PER_PLAYER,
  type Dir,
  type Seat,
  type UwCard,
  type UwMove,
  type UwState,
} from '@/urban/state'
import { usePack } from '../table/packContext'

/** Urban Warfare at the Table: hot-seat or against a bot. Rules run in `src/urban/`. */

type Mode = 'hotseat' | UwLevel
type Pick = { hand: UwCard } | { zone: number } | null

const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' }
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
  const [history, setHistory] = useState<UwState[]>([])
  const [pick, setPick] = useState<Pick>(null)
  const [handoff, setHandoff] = useState(false)
  const s = history[history.length - 1]

  const start = () => {
    const first = (Math.random() < 0.5 ? 0 : 1) as Seat
    setHistory([createGame(deal(read.cards), first)])
    setPick(null)
    setHandoff(mode === 'hotseat')
  }

  const botSeat: Seat | null = mode === 'hotseat' ? null : 1
  const viewer: Seat = !s ? 0 : botSeat === null ? s.turn : 0

  const play = (m: UwMove) => {
    if (!s) return
    const n = apply(s, m)
    setHistory((h) => [...h, n])
    setPick(null)
    if (mode === 'hotseat' && n.winner === null && n.turn !== s.turn) setHandoff(true)
  }

  // The bot's turn.
  useEffect(() => {
    if (!s || s.winner !== null || botSeat === null || s.turn !== botSeat) return
    const t = setTimeout(
      () => setHistory((h) => [...h, apply(s, botMove(s, mode as UwLevel))]),
      500,
    )
    return () => clearTimeout(t)
  }, [s, botSeat, mode])

  const undo = () => {
    setPick(null)
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
      {s && (
        <IconButton label="Undo" onClick={undo} disabled={history.length <= 1}>
          <Undo2 />
        </IconButton>
      )}
      <IconButton label="How to play" onClick={onHelp}>
        <CircleHelp />
      </IconButton>
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
            </select>
          </label>
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
        </div>
      </div>
    )

  const legal = s.winner === null && s.turn !== botSeat ? legalMoves(s) : []
  const myHand = s.hands[viewer]
  const opp = (1 - viewer) as Seat

  // Moves for the current pick.
  const sameCard = (m: UwMove, c: UwCard) => {
    if (m.type !== 'place') return false
    const mc = s.hands[s.turn].find((x) => x.id === m.card)
    return !!mc && mc.kind === c.kind && mc.fp === c.fp
  }
  const pickMoves =
    pick && 'hand' in pick
      ? legal
          .filter((m) => sameCard(m, pick.hand))
          .map((m) => (m.type === 'place' ? { ...m, card: pick.hand.id } : m))
      : pick && 'zone' in pick
        ? legal.filter((m) => (m.type === 'move' || m.type === 'bomb') && m.from === pick.zone)
        : []
  const zoneTargets = (z: number) =>
    pickMoves.filter(
      (m) =>
        (m.type === 'place' && m.zone === z) || (m.type === 'move' && step(m.from, m.dir) === z),
    )

  const tapZone = (z: number) => {
    if (handoff) return
    const t = zoneTargets(z)
    if (t.length === 1) return play(t[0])
    if (t.length > 1) return // corner: choose a direction below
    const p = s.field[z]
    if (
      p &&
      p.owner === s.turn &&
      legal.some((m) => (m.type === 'move' || m.type === 'bomb') && m.from === z)
    )
      setPick(pick && 'zone' in pick && pick.zone === z ? null : { zone: z })
    else setPick(null)
  }

  const cornerChoice =
    pick && 'hand' in pick
      ? pickMoves.filter((m) => m.type === 'place' && m.dir && placeDirs(m.zone).length > 1)
      : []
  const fieldPick = pick && 'zone' in pick ? pick.zone : null

  const banner =
    s.winner !== null
      ? s.winner === 'draw'
        ? 'Draw.'
        : `Player ${s.winner + 1} wins (${s.reason === 'battleline' ? 'Battleline' : s.reason === 'objective' ? 'Objective' : 'Attrition'}).`
      : s.turn === botSeat
        ? 'The bot is thinking…'
        : `Player ${s.turn + 1}: ${s.placementsLeft === 2 ? 'place 2 cards' : s.turnsTaken[s.turn] === 0 ? 'place a card' : 'place, move, bomb or pass'}.`

  const hold = s.centerHold
  const cell = phone ? 'w-[22vw] max-w-28' : 'w-32'

  return (
    <div className="flex h-full flex-col bg-canvas">
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
          <OppCounts s={s} seat={opp} />
          <div className="grid grid-cols-3 gap-1.5">
            {s.field.map((p, z) => {
              const target = zoneTargets(z).length > 0
              return (
                <button
                  key={z}
                  type="button"
                  aria-label={`Zone ${z + 1}${p ? `: player ${p.owner + 1}'s ${p.card.name}` : ''}`}
                  onPointerUp={() => tapZone(z)}
                  className={cn(
                    'relative aspect-[63/88] rounded-md border bg-panel',
                    cell,
                    z === CENTER && 'border-2 border-amber-500',
                    target && 'outline outline-2 outline-green-500',
                    fieldPick === z && 'outline outline-2 outline-amber-500',
                  )}
                >
                  {p && (
                    <>
                      <CardFace
                        card={p.card}
                        className={cn('h-full w-full rounded-md ring-4', SEAT_RING[p.owner])}
                      />
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 text-xs font-bold text-white">
                        {strength(s.field, z)}
                      </span>
                    </>
                  )}
                  {!p && (
                    <span className="text-xs text-muted-foreground">
                      {z === CENTER ? 'Center' : z + 1}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Center:{' '}
            {hold ? (
              <span className={SEAT_TEXT[hold.seat]}>
                Player {hold.seat + 1}, {hold.oppTurns}/2 turns held
              </span>
            ) : (
              'nobody'
            )}
          </p>
          {cornerChoice.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {cornerChoice.map((m, i) => (
                <Button key={i} size="sm" variant="outline" onClick={() => play(m)}>
                  Zone {m.type === 'place' && m.zone + 1}: push{' '}
                  {m.type === 'place' && m.dir && ARROW[m.dir]}
                </Button>
              ))}
            </div>
          )}
          {fieldPick !== null && (
            <div className="flex flex-wrap justify-center gap-2">
              {pickMoves.map((m, i) =>
                m.type === 'move' && step(m.from, m.dir) === null ? (
                  <Button key={i} size="sm" variant="outline" onClick={() => play(m)}>
                    {ARROW[m.dir]} Off the field
                  </Button>
                ) : m.type === 'bomb' ? (
                  <Button key={i} size="sm" variant="danger" onClick={() => play(m)}>
                    Bomb{m.target !== undefined ? ` + zone ${m.target + 1}` : ' (alone)'}
                  </Button>
                ) : null,
              )}
            </div>
          )}
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
                    onPointerUp={() => setPick(picked ? null : { hand: c })}
                    className={cn(
                      'w-16 rounded-md disabled:opacity-50',
                      picked && 'outline outline-2 outline-amber-500',
                      usable && !picked && 'outline outline-1 outline-green-500',
                    )}
                  >
                    <CardFace card={c} className="aspect-[63/88] w-full rounded-md" />
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex gap-2">
            {legal.some((m) => m.type === 'pass') && !handoff && (
              <Button variant="secondary" size="sm" onClick={() => play({ type: 'pass' })}>
                Pass
              </Button>
            )}
            {s.winner !== null && (
              <Button size="sm" onClick={() => setHistory([])}>
                New game
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
