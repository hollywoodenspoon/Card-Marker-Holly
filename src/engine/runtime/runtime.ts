/**
 * The runtime: a game running, for the Engine's Play button ("Play the game",
 * "Play from here"). It shows scenes, runs their Cause and Effect, and keeps
 * variables, shown/hidden things and decks built on the fly in memory (saves come
 * later). A message or a choice pauses the running steps until the player answers;
 * "Start a card game" hands over to Play's table and carries on when they return.
 */
import { create } from 'zustand'
import { useWorkspace } from '@/app/workspace'
import { requestMatch } from '@/playtest/handoff'
import { next, randomSeed } from '@/playtest/rng'
import { loadGameCards, useGameCards } from '../cards/gameCards'
import { recipeRunner, runSteps } from '../events/run'
import type { RunContext } from '../events/pieces'
import type { Args, GameEvent } from '../model/events'
import { countsOf, deckList, type DeckLevel, type GameDoc, type Scene } from '../model/game'
import { deckBuilderFor } from '../modules/registry'

export interface RuntimeState {
  running: boolean
  game: GameDoc | null
  sceneId: string | null
  /** Scenes to go Back to, most recent last. */
  trail: string[]
  vars: Record<string, boolean | number>
  /** Things shown or hidden by Cause and Effect (otherwise as placed). */
  hidden: Record<string, boolean>
  /** Decks as they are while playing (built on the fly or copied from the game). */
  decks: Record<string, Record<string, number>>
  message: string | null
  choice: { prompt: string; options: string[] } | null
  /** A longer job the player waits for ("Building a deck… 40%"). */
  status: string | null
  /** True while Play's table runs a card game this game started. */
  away: boolean
  /** Steps are running (clicks wait until they finish). */
  busy: boolean
}

const idle: RuntimeState = {
  running: false,
  game: null,
  sceneId: null,
  trail: [],
  vars: {},
  hidden: {},
  decks: {},
  message: null,
  choice: null,
  status: null,
  away: false,
  busy: false,
}

export const useRuntime = create<RuntimeState>(() => ({ ...idle }))

const set = (s: Partial<RuntimeState>) => useRuntime.setState(s)
const get = () => useRuntime.getState()

let seed = 1
let run = 0
let queue: Promise<void> = Promise.resolve()
let answer: ((i: number) => void) | null = null

/** Answer the open message (any index) or choice (the picked option). */
export function answerRuntime(i = 0) {
  const a = answer
  answer = null
  set({ message: null, choice: null })
  a?.(i)
}

function sceneById(id: string | null): Scene | null {
  return get().game?.scenes.find((s) => s.id === id) ?? null
}

function cardsReady(game: GameDoc) {
  const c = useGameCards.getState()
  if (c.gameId === game.id && c.status === 'ready') return Promise.resolve()
  return loadGameCards(game)
}

function context(id: number): RunContext {
  const live = () => run === id && get().running
  const ctx: RunContext = {
    getVar: (v) => get().vars[v],
    setVar: (v, value) => set({ vars: { ...get().vars, [v]: value } }),
    random: () => {
      const [v, s] = next(seed)
      seed = s
      return v
    },
    goToScene: (sceneId) => {
      if (!sceneById(sceneId)) return
      const now = get().sceneId
      set({ sceneId, trail: now && now !== sceneId ? [...get().trail, now] : get().trail })
      enqueue(sceneStart(sceneId))
    },
    setObjectVisible: (obj, visible) => set({ hidden: { ...get().hidden, [obj]: !visible } }),
    showMessage: (text) =>
      new Promise<void>((resolve) => {
        if (!live()) return resolve()
        answer = () => resolve()
        set({ message: text })
      }),
    choose: (prompt, options) =>
      new Promise<number>((resolve) => {
        if (!live()) return resolve(0)
        answer = resolve
        set({ choice: { prompt, options } })
      }),
    wait: (ms) => new Promise((r) => setTimeout(r, Math.max(0, Math.min(60_000, ms)))),
    runRecipe: (r) => recipes(r),
    call: (service, args) => callService(service, args, live),
    stopped: () => !live(),
  }
  const recipes = recipeRunner(get().game?.recipes ?? [], () => ctx)
  return ctx
}

/** Run steps one batch at a time, in order (a scene's start waits for the click that went there). */
function enqueue(events: GameEvent[]) {
  if (!events.length) return queue
  const id = run
  queue = queue.then(async () => {
    if (id !== run) return
    set({ busy: true })
    try {
      const ctx = context(id)
      for (const ev of events) await runSteps(ev.steps, ctx)
    } catch (e) {
      console.error('Cause and effect failed', e)
    } finally {
      if (id === run) set({ busy: false })
    }
  })
  return queue
}

const byCause = (events: GameEvent[], cause: string) =>
  events.filter((e) => e.cause.piece === cause)

function sceneStart(id: string): GameEvent[] {
  return byCause(sceneById(id)?.events ?? [], 'scene.start')
}

/** Start playing: from the start (with "the game starts" events) or from one scene. */
export function startRuntime(game: GameDoc, from?: string) {
  run++
  answer = null
  seed = randomSeed()
  queue = Promise.resolve()
  const first = from ?? game.startScene ?? game.scenes[0]?.id ?? null
  set({
    ...idle,
    running: true,
    game,
    sceneId: first,
    vars: Object.fromEntries(game.variables.map((v) => [v.id, v.initial])),
    hidden: {},
    decks: Object.fromEntries(game.decks.map((d) => [d.id, { ...d.counts }])),
  })
  if (!from) void enqueue(byCause(game.events, 'game.start'))
  if (first) void enqueue(sceneStart(first))
}

export function stopRuntime() {
  run++
  answer = null
  set({ ...idle })
}

/** The player clicked an area or an object. Ignored while steps are running. */
export function clickThing(events: GameEvent[]) {
  if (get().busy || get().message || get().choice) return
  void enqueue(byCause(events, 'area.click'))
}

/** Back to the previous scene. */
export function backScene() {
  const st = get()
  if (st.busy || !st.trail.length) return
  const prev = st.trail[st.trail.length - 1]
  set({ sceneId: prev, trail: st.trail.slice(0, -1) })
  void enqueue(sceneStart(prev))
}

// ---------- services modules plug in: deck building, card games ----------

async function callService(service: string, a: Args, live: () => boolean) {
  const game = get().game
  if (!game || !live()) return
  if (service === 'deck.build') return buildDeckNow(game, a, live)
  if (service === 'cards.play') return playCards(game, a, live)
}

async function buildDeckNow(game: GameDoc, a: Args, live: () => boolean) {
  const into = String(a.into ?? '')
  if (!into) return
  set({ status: 'Getting the cards ready…' })
  try {
    await cardsReady(game)
    const pool = useGameCards.getState().merged?.pack.info.cards ?? []
    const builder = deckBuilderFor(pool)
    if (!builder) {
      set({ status: null })
      return void (await context(run).showMessage(
        'These cards have no deck builder yet (their game module brings one).',
      ))
    }
    const fromDeck = a.from ? get().decks[String(a.from)] : null
    const from = fromDeck ? pool.filter((c) => fromDeck[c.id]) : pool
    const gauntlet = Object.entries(get().decks)
      .filter(([id]) => id !== into)
      .map(([, counts]) => deckList({ counts }))
      .filter((d) => d.length)
    const level = (String(a.level ?? 'optimal') as DeckLevel) || 'optimal'
    const ids = await builder.build({
      cacheKey: game.id,
      pool,
      from,
      level,
      seed: Math.floor(next(seed)[0] * 2 ** 31),
      gauntlet,
      onProgress: (p) => live() && set({ status: `Building a deck… ${Math.round(p * 100)}%` }),
      stopped: () => !live(),
    })
    if (ids && live()) set({ decks: { ...get().decks, [into]: countsOf(ids) } })
  } finally {
    if (live()) set({ status: null })
  }
}

async function playCards(game: GameDoc, a: Args, live: () => boolean) {
  const decks = get().decks
  const list = (id: unknown) => deckList({ counts: decks[String(id ?? '')] ?? {} })
  const mine = list(a.deckA)
  const theirs = list(a.deckB)
  if (!mine.length || !theirs.length)
    return context(run).showMessage('A card game needs two decks with cards in them.')
  const name = (id: unknown) => game.decks.find((d) => d.id === id)?.name ?? 'Deck'
  const bot = a.bot === 'none' ? null : ((a.bot as 'easy' | 'normal' | 'hard') ?? 'normal')
  const result = await new Promise<{ winner: number | null; finished: boolean }>((done) => {
    requestMatch({
      gameId: game.id,
      gameName: game.name,
      decks: [mine, theirs],
      names: [`You (${name(a.deckA)})`, bot ? `${name(a.deckB)} (bot)` : name(a.deckB)],
      bot,
      done,
    })
    set({ away: true })
    useWorkspace.getState().playGame(game.id)
  })
  if (!live()) return
  set({ away: false })
  if (a.won) set({ vars: { ...get().vars, [String(a.won)]: result.winner === 0 } })
}
