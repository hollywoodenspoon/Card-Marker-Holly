import { create } from 'zustand'
import type { BotLevel } from '@/adventure/bot'
import { actor, apply, applyFrames, createGame, type Move, type NewGame } from '@/adventure/engine'
import type { AsState } from '@/adventure/state'
import { toTable } from '@/adventure/table'
import { applyAction, type TableAction } from '@/playtest/actions'
import { randomSeed } from '@/playtest/rng'
import type { GameSetup } from '@/playtest/setup'
import { createTable, type DeckCards, type TableState } from '@/playtest/state'
import { intentOf, type Intent } from './intent'
import { movesFor, tapPiece } from './rulesPlay'

const HISTORY = 500

/** A bot level per seat (null: a person plays that seat). */
export type Bots = [BotLevel | null, BotLevel | null]
/** How long each action stays on screen; Rush plays without pauses. */
export type Speed = 'slow' | 'normal' | 'fast' | 'rush'
export const SPEED_MS: Record<Speed, number> = { slow: 1800, normal: 1000, fast: 350, rush: 0 }
const NO_BOTS: Bots = [null, null]
const SPEED_KEY = 'hearthside-table-speed'
const THINK_KEY = 'hearthside-table-hard-think'
/** How long the Hard bot may think per move on the table (ms). */
export const THINK_TIMES = [500, 1000, 2000, 4000] as const

function savedThink(): number {
  try {
    const v = Number(localStorage.getItem(THINK_KEY))
    return (THINK_TIMES as readonly number[]).includes(v) ? v : 1000
  } catch {
    return 1000
  }
}

function savedSpeed(): Speed {
  try {
    const v = localStorage.getItem(SPEED_KEY)
    return v && v in SPEED_MS ? (v as Speed) : 'normal'
  } catch {
    return 'normal'
  }
}

/**
 * A move being shown one action at a time: `frames` from `applyFrames` (one
 * per log line), `from` the state before it. `rules` already holds the result.
 */
export interface Playback {
  from: AsState
  frames: AsState[]
  /** −1 while the intent beat shows, before the first frame. */
  i: number
  /** What the player is about to do, shown first when someone else plays. */
  intent?: Intent | null
}

/**
 * Watching a finished game. The game that was open is put aside (`stash`) and
 * comes back on leaving.
 */
export interface Replay {
  /** Every frame of the game, from the start. */
  frames: AsState[]
  /** Per frame: the move it belongs to. */
  move: number[]
  i: number
  playing: boolean
  title: string
  /** The game watched, as its start and moves (to save it as a file). */
  game: NewGame
  moves: Move[]
  stash: Stash
}

type Stash = Pick<
  PlaytestStore,
  | 'setup'
  | 'state'
  | 'past'
  | 'future'
  | 'viewer'
  | 'rules'
  | 'rulesPast'
  | 'rulesFuture'
  | 'bots'
  | 'game'
  | 'moves'
  | 'movesFuture'
  | 'packId'
>

const NO_RULES = {
  rules: null,
  rulesPast: [],
  rulesFuture: [],
  picks: [],
  choice: null,
  bots: NO_BOTS,
  botPaused: false,
  playback: null,
  game: null,
  moves: [],
  movesFuture: [],
}

/** Who sees the table at the start: the one person against a bot, or the player to act. */
function firstViewer(rules: AsState, bots: Bots, hotseat: boolean): number | null {
  const people = ([0, 1] as const).filter((s) => !bots[s])
  if (people.length === 1) return people[0]
  if (people.length === 0) return null
  return hotseat ? actor(rules) : null
}

export type Selection = { kind: 'piece'; id: string } | { kind: 'token'; id: string } | null

interface PlaytestStore {
  /** The pack the game is played with. */
  packId: string | null
  setup: GameSetup | null
  state: TableState | null
  past: TableState[]
  future: TableState[]
  selected: Selection
  /** Tap-to-place: the next tap on the table moves the selection there. */
  placing: boolean
  /** Who the table is shown to (null: everyone, when you play every seat). */
  viewer: number | null
  /**
   * Adventure Scuffle with rules on: the rules state and its own undo history.
   * `state` is then drawn from it, and table actions become rule moves.
   */
  rules: AsState | null
  rulesPast: AsState[]
  rulesFuture: AsState[]
  /** Positions picked for a pair reveal so far. */
  picks: number[]
  /** The choice option a tapped card stands for, waiting to be confirmed. */
  choice: string | null
  /** The combat stage is tucked away, showing the table under it. */
  stageHidden: boolean
  /** Seats the bot plays, and how fast it moves. */
  bots: Bots
  speed: Speed
  /** The Hard bot's thinking time per move (ms). */
  thinkMs: number
  botPaused: boolean
  /** The move being shown action by action (null: nothing to show). */
  playback: Playback | null
  /** A finished game being watched (the open game waits in its stash). */
  replay: Replay | null
  /** How the rules game began, and its moves, one group per `play` (for replays). */
  game: NewGame | null
  moves: Move[][]
  movesFuture: Move[][]
  start: (packId: string, setup: GameSetup, decks: (DeckCards | null)[]) => void
  /**
   * Start a game with the rules on. `hotseat`: two people share the device, so
   * each player's cards are hidden between turns. `bots`: seats the bot plays.
   */
  startRules: (
    packId: string,
    setup: GameSetup,
    game: NewGame,
    opts: { hotseat: boolean; bots?: Bots },
  ) => void
  /** Continue a saved game. */
  resume: (
    packId: string,
    setup: GameSetup,
    state: TableState,
    past: TableState[],
    rules?: {
      state: AsState
      past: AsState[]
      viewer: number | null
      bots?: Bots
      game?: NewGame
      moves?: Move[][]
    },
  ) => void
  setSpeed: (s: Speed) => void
  setThinkMs: (ms: number) => void
  /** Show the next action of the playback (or end it). */
  nextFrame: () => void
  /** Jump to the end of the playback. */
  skip: () => void
  /** Watch a game from its start and moves. */
  watch: (setup: GameSetup, game: NewGame, moves: Move[], title: string) => void
  /** Go to a frame of the replay. */
  seek: (i: number) => void
  setReplayPlaying: (p: boolean) => void
  /** Leave the replay: the open game comes back. */
  leaveReplay: () => void
  setBotPaused: (p: boolean) => void
  act: (a: TableAction) => void
  /** Play rule moves as one undo step. */
  play: (moves: Move | Move[]) => void
  /** A tap on a piece under the rules; false when the rules don't use it. */
  tapRules: (pieceId: string) => boolean
  undo: () => void
  redo: () => void
  /** New game: clear the table (the pack stays open). */
  end: () => void
  /** Another pack was opened without a saved game. */
  clear: (packId: string) => void
  select: (s: Selection, placing?: boolean) => void
  setViewer: (v: number | null) => void
}

/** The open game (saved per pack by the Playtest app, so a reload continues it). */
export const usePlaytest = create<PlaytestStore>((set, get) => ({
  packId: null,
  setup: null,
  state: null,
  past: [],
  future: [],
  selected: null,
  placing: false,
  viewer: null,
  rules: null,
  rulesPast: [],
  rulesFuture: [],
  picks: [],
  choice: null,
  bots: NO_BOTS,
  stageHidden: false,
  speed: savedSpeed(),
  thinkMs: savedThink(),
  botPaused: false,
  playback: null,
  replay: null,
  game: null,
  moves: [],
  movesFuture: [],
  start: (packId, setup, decks) =>
    set({
      packId,
      setup,
      state: createTable(setup, decks, randomSeed()),
      past: [],
      future: [],
      selected: null,
      placing: false,
      ...NO_RULES,
    }),
  startRules: (packId, setup, game, { hotseat, bots = NO_BOTS }) => {
    const rules = createGame(game)
    set({
      packId,
      setup,
      state: toTable(setup, rules),
      past: [],
      future: [],
      selected: null,
      placing: false,
      rules,
      rulesPast: [],
      rulesFuture: [],
      picks: [],
      choice: null,
      bots,
      botPaused: false,
      playback: null,
      game,
      moves: [],
      movesFuture: [],
      viewer: firstViewer(rules, bots, hotseat),
    })
  },
  resume: (packId, setup, state, past, rules) =>
    set({
      packId,
      setup,
      state: rules ? toTable(setup, rules.state) : state,
      past,
      future: [],
      selected: null,
      placing: false,
      ...(rules
        ? {
            rules: rules.state,
            rulesPast: rules.past,
            rulesFuture: [],
            picks: [],
            choice: null,
            viewer: rules.viewer,
            bots: rules.bots ?? NO_BOTS,
            botPaused: false,
            playback: null,
            game: rules.game ?? null,
            moves: rules.moves ?? [],
            movesFuture: [],
          }
        : NO_RULES),
    }),
  play: (moves) => {
    const { setup, rules, rulesPast, speed, replay, game } = get()
    if (!setup || !rules || replay) return
    // Moves played while a playback runs (a bot's, a quick tap) end it first.
    let next = rules
    const frames: AsState[] = []
    const played: Move[] = []
    for (const m of Array.isArray(moves) ? moves : [moves]) {
      const f = speed === 'rush' ? [apply(next, m)] : applyFrames(next, m)
      if (!f.length || f.at(-1) === next) continue
      frames.push(...f)
      played.push(m)
      next = f.at(-1)!
    }
    if (next === rules) return
    const show = speed !== 'rush' && frames.length > 0
    // Someone else's move: a beat first that shows the cards they pick.
    const who = actor(rules)
    const intent =
      show && who !== null && get().viewer !== who && played.length
        ? intentOf(rules, played[0])
        : null
    set({
      rules: next,
      state: toTable(setup, intent ? rules : show ? frames[0] : next),
      rulesPast: [...rulesPast, rules].slice(-HISTORY),
      rulesFuture: [],
      playback: show ? { from: rules, frames, i: intent ? -1 : 0, intent } : null,
      moves: game ? [...get().moves, played] : [],
      movesFuture: [],
      picks: [],
      choice: null,
      selected: null,
      placing: false,
    })
  },
  nextFrame: () => {
    const { setup, playback, rules } = get()
    if (!setup || !playback || !rules) return
    const i = playback.i + 1
    if (i >= playback.frames.length) return get().skip()
    set({ playback: { ...playback, i }, state: toTable(setup, playback.frames[i]) })
  },
  skip: () => {
    const { setup, playback, rules } = get()
    if (!setup || !playback || !rules) return
    set({ playback: null, state: toTable(setup, rules) })
  },
  watch: (setup, game, moves, title) => {
    const cur = get()
    const stash: Stash = {
      setup: cur.setup,
      state: cur.state,
      past: cur.past,
      future: cur.future,
      viewer: cur.viewer,
      rules: cur.replay ? cur.replay.stash.rules : cur.rules,
      rulesPast: cur.rulesPast,
      rulesFuture: cur.rulesFuture,
      bots: cur.bots,
      game: cur.game,
      moves: cur.moves,
      movesFuture: cur.movesFuture,
      packId: cur.packId,
    }
    let s = createGame(game)
    const frames = [s]
    const move = [-1]
    moves.forEach((m, n) => {
      const f = applyFrames(s, m)
      if (!f.length) return
      frames.push(...f)
      move.push(...f.map(() => n))
      s = f.at(-1)!
    })
    set({
      replay: {
        frames,
        move,
        i: 0,
        playing: true,
        title,
        game,
        moves,
        stash: cur.replay?.stash ?? stash,
      },
      setup,
      state: toTable(setup, frames[0]),
      rules: frames[0],
      past: [],
      future: [],
      rulesPast: [],
      rulesFuture: [],
      playback: null,
      bots: NO_BOTS,
      viewer: null,
      picks: [],
      choice: null,
      selected: null,
      placing: false,
    })
  },
  seek: (i) => {
    const { replay, setup } = get()
    if (!replay || !setup) return
    const at = Math.max(0, Math.min(replay.frames.length - 1, i))
    set({
      replay: { ...replay, i: at, playing: replay.playing && at < replay.frames.length - 1 },
      rules: replay.frames[at],
      state: toTable(setup, replay.frames[at]),
    })
  },
  setReplayPlaying: (playing) => {
    const { replay } = get()
    if (!replay) return
    const atEnd = replay.i >= replay.frames.length - 1
    set({ replay: { ...replay, playing, i: playing && atEnd ? 0 : replay.i } })
    if (playing && atEnd) get().seek(0)
  },
  leaveReplay: () => {
    const { replay } = get()
    if (!replay) return
    set({ ...replay.stash, replay: null, playback: null, picks: [], choice: null, selected: null })
  },
  tapRules: (pieceId) => {
    const { rules, picks, play, select, bots, playback, replay } = get()
    if (!rules) return false
    // Watching: taps only look.
    if (playback || replay) return false
    // The bot's turn: taps only look.
    const a = actor(rules)
    if (a !== null && bots[a]) return false
    const r = tapPiece(rules, picks, pieceId)
    if (!r) return false
    if (r.kind === 'moves') play(r.moves)
    else if (r.kind === 'pick') set({ picks: r.picks, selected: null })
    else if (r.kind === 'choice')
      set({ choice: get().choice === r.id ? null : r.id, selected: null })
    else select({ kind: 'piece', id: pieceId }, true)
    return true
  },
  act: (a) => {
    const { setup, state, past, rules } = get()
    if (!setup || !state) return
    if (rules) {
      const who = actor(rules)
      const watching = get().playback || get().replay
      const moves = watching || (who !== null && get().bots[who]) ? null : movesFor(rules, a)
      if (moves) get().play(moves)
      else set({ placing: false })
      return
    }
    const next = applyAction(setup, state, a)
    if (next === state) return
    set({ state: next, past: [...past, state].slice(-HISTORY), future: [], placing: false })
  },
  undo: () => {
    const { setup, rules, rulesPast, rulesFuture, bots, replay, moves, movesFuture } = get()
    if (replay) return
    if (setup && rules) {
      if (!rulesPast.length) return
      // Against a bot, undo goes back to your own last decision (the bot's moves too).
      const person = (s: AsState) => {
        const a = actor(s)
        return a === null || !bots[a]
      }
      const againstBot = bots.some(Boolean) && bots.some((b) => !b)
      let n = 1
      if (againstBot) while (n < rulesPast.length && !person(rulesPast.at(-n)!)) n++
      const prev = rulesPast.at(-n)!
      return set({
        rules: prev,
        state: toTable(setup, prev),
        rulesPast: rulesPast.slice(0, -n),
        rulesFuture: [...rulesPast.slice(-n + 1 || rulesPast.length), rules, ...rulesFuture],
        moves: moves.slice(0, Math.max(0, moves.length - n)),
        movesFuture: [...moves.slice(Math.max(0, moves.length - n)), ...movesFuture],
        playback: null,
        picks: [],
        choice: null,
        placing: false,
        botPaused: againstBot ? false : get().botPaused,
      })
    }
    const { state, past, future } = get()
    if (!state || !past.length) return
    set({
      state: past.at(-1)!,
      past: past.slice(0, -1),
      future: [state, ...future],
      placing: false,
    })
  },
  redo: () => {
    const { setup, rules, rulesPast, rulesFuture, replay, moves, movesFuture } = get()
    if (replay) return
    if (setup && rules) {
      if (!rulesFuture.length) return
      const next = rulesFuture[0]
      return set({
        rules: next,
        state: toTable(setup, next),
        rulesPast: [...rulesPast, rules],
        rulesFuture: rulesFuture.slice(1),
        moves: movesFuture.length ? [...moves, movesFuture[0]] : moves,
        movesFuture: movesFuture.slice(1),
        playback: null,
        picks: [],
        choice: null,
        placing: false,
      })
    }
    const { state, past, future } = get()
    if (!state || !future.length) return
    set({ state: future[0], past: [...past, state], future: future.slice(1), placing: false })
  },
  clear: (packId) =>
    set({
      packId,
      setup: null,
      state: null,
      past: [],
      future: [],
      selected: null,
      placing: false,
      ...NO_RULES,
    }),
  end: () =>
    set({
      setup: null,
      state: null,
      past: [],
      future: [],
      selected: null,
      placing: false,
      ...NO_RULES,
    }),
  select: (selected, placing = false) => set({ selected, placing }),
  setViewer: (viewer) => set({ viewer }),
  setSpeed: (speed) => {
    try {
      localStorage.setItem(SPEED_KEY, speed)
    } catch {
      // Not saved (private mode): the choice still holds for this visit.
    }
    if (speed === 'rush') get().skip()
    set({ speed })
  },
  setThinkMs: (thinkMs) => {
    try {
      localStorage.setItem(THINK_KEY, String(thinkMs))
    } catch {
      // Not saved (private mode): the choice still holds for this visit.
    }
    set({ thinkMs })
  },
  setBotPaused: (botPaused) => set({ botPaused }),
}))

/** The rules state on screen: the playback's current action, or the game itself. */
export const shownRules = (s: PlaytestStore): AsState | null =>
  s.playback ? (s.playback.i < 0 ? s.playback.from : s.playback.frames[s.playback.i]) : s.rules

/** The moment before the one on screen, while actions are being shown (for the cues). */
export const shownBefore = (s: PlaytestStore): AsState | null => {
  if (s.playback) return s.playback.i > 0 ? s.playback.frames[s.playback.i - 1] : s.playback.from
  if (s.replay) return s.replay.i > 0 ? s.replay.frames[s.replay.i - 1] : null
  return null
}
