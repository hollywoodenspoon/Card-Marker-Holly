/**
 * The runtime: a game running, for the Engine's Play button ("Play the game",
 * "Play from here"). It shows scenes, runs their Cause and Effect, and keeps
 * variables, shown/hidden things, decks, the player's money, items and cards,
 * and the week in memory, with saves in the Engine DB. A message, a choice or a
 * screen (shop, booster, activities…) pauses the running steps until the player
 * answers; "Start a card game" hands over to Play's table and carries on when they
 * return. The player's world (world.ts) works on the same state.
 */
import { useWorkspace } from '@/app/workspace'
import { requestMatch } from '@/playtest/handoff'
import { next, randomSeed } from '@/playtest/rng'
import { loadGameCards, useGameCards } from '../cards/gameCards'
import { collectionOf } from '../economy/collection'
import { recipeRunner, runSteps } from '../events/run'
import type { RunContext } from '../events/pieces'
import { emptyWorld } from '../league/worldState'
import { makeRng } from '../league/rng'
import { startingDuelists } from '../league/duelists'
import { dateLabel, eventsOn } from '../model/calendar'
import type { Args, GameEvent } from '../model/events'
import { countsOf, deckList, type DeckLevel, type GameDoc, type Scene } from '../model/game'
import { autoSlotNames } from '../model/settings'
import { deckBuilderFor } from '../modules/registry'
import { listSaves, readSave, writeSave, type SaveSlot } from '../storage/saves'
import { leagueCards } from './leagueCards'
import { fromSnapshot, takeSnapshot, type Snapshot } from './snapshot'
import { closeScreen, get, idle, pushLog, set, useRuntime } from './state'
import { fillText } from './text'
import { makeWorld } from './world'

export { useRuntime, closeScreen }
export type { RuntimeState } from './state'

let seed = 1
let run = 0
let queue: Promise<void> = Promise.resolve()
let answer: ((i: number) => void) | null = null

/** Answer the open message (any index) or choice (the picked option). */
export function answerRuntime(i = 0) {
  const a = answer
  answer = null
  const c = get().choice
  if (c?.options[i] !== undefined) pushLog({ name: null, color: null, text: `▸ ${c.options[i]}` })
  set({ message: null, speaker: null, choice: null })
  a?.(i)
}

/** Text with the game's variables and the date filled in. */
export function textOf(text: string): string {
  const st = get()
  const g = st.game
  if (!g) return text
  return fillText(text, g.variables, st.vars, { calendar: g.calendar, week: st.week })
}

/** Rolls the game's random numbers (shared with world.ts). */
export function random(): number {
  const [v, s] = next(seed)
  seed = s
  return v
}

export const randomInt = () => Math.floor(random() * 2 ** 31)

function sceneById(id: string | null): Scene | null {
  return get().game?.scenes.find((s) => s.id === id) ?? null
}

export function cardsReady(game: GameDoc) {
  const c = useGameCards.getState()
  if (c.gameId === game.id && c.status === 'ready') return Promise.resolve()
  return loadGameCards(game)
}

/** Shows a message (with a speaker, for dialogue) and waits for the player. */
export function showMessage(text: string, live: () => boolean, speaker = get().speaker) {
  return new Promise<void>((resolve) => {
    if (!live()) return resolve()
    const filled = textOf(text)
    pushLog({ name: speaker?.name ?? null, color: speaker?.color ?? null, text: filled })
    answer = () => resolve()
    set({ message: filled, speaker })
  })
}

function context(id: number): RunContext {
  const live = () => run === id && get().running && !get().ended
  const ctx: RunContext = {
    getVar: (v) => get().vars[v],
    setVar: (v, value) => set({ vars: { ...get().vars, [v]: value } }),
    random,
    goToScene: (sceneId) => {
      if (!sceneById(sceneId)) return
      const now = get().sceneId
      set({ sceneId, trail: now && now !== sceneId ? [...get().trail, now] : get().trail })
      if (get().game?.settings.autosaveOnScene) autosave()
      enqueue(sceneStart(sceneId))
    },
    setObjectVisible: (obj, visible) => set({ hidden: { ...get().hidden, [obj]: !visible } }),
    showMessage: (text) => showMessage(text, live, null),
    choose: (prompt, options) =>
      new Promise<number>((resolve) => {
        if (!live()) return resolve(0)
        answer = resolve
        const p = textOf(prompt)
        if (p) pushLog({ name: null, color: null, text: p })
        set({ choice: { prompt: p, options: options.map(textOf) } })
      }),
    wait: (ms) => new Promise((r) => setTimeout(r, Math.max(0, Math.min(60_000, ms)))),
    runRecipe: (r) => recipes(r),
    call: (service, args) => callService(service, args, live),
    stopped: () => !live(),
  }
  ctx.world = makeWorld(ctx, live, () => byCause(get().game?.events ?? [], 'week.start'))
  const recipes = recipeRunner(get().game?.recipes ?? [], () => ctx)
  return ctx
}

export const currentContext = () => context(run)

/** Runs a job in the same queue as the steps (the player's clicks wait for it). */
export function enqueueTask(job: () => Promise<void>) {
  const id = run
  queue = queue.then(async () => {
    if (id !== run) return
    set({ busy: true })
    try {
      await job()
    } catch (e) {
      console.error('Task failed', e)
    } finally {
      if (id === run) set({ busy: false })
    }
  })
  return queue
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

/** The calendar's "auto" events on a week, as events to run. */
export function autoEvents(game: GameDoc, week: number, calSeed: number): GameEvent[] {
  return eventsOn(game.calendar, week, calSeed)
    .filter((e) => e.mode === 'auto')
    .map((e) => ({ id: e.id, cause: { piece: 'week.start', args: {} }, steps: e.steps }))
}

function reset() {
  run++
  answer = null
  closeScreen()
  queue = Promise.resolve()
}

/** Start playing: from the start (with "the game starts" events) or from one scene. */
export function startRuntime(game: GameDoc, from?: string) {
  reset()
  seed = randomSeed()
  const first = from ?? game.startScene ?? game.scenes[0]?.id ?? null
  const start = game.decks.find((d) => d.id === game.economy.startingCards)
  set({
    ...idle,
    running: true,
    game,
    sceneId: first,
    vars: Object.fromEntries(game.variables.map((v) => [v.id, v.initial])),
    hidden: {},
    decks: Object.fromEntries(game.decks.map((d) => [d.id, { ...d.counts }])),
    collection: start ? collectionOf(start.counts) : {},
    calSeed: randomSeed() || 1,
  })
  void enqueueTask(() => prepareWorld(game, run))
  if (!from) {
    void enqueue(byCause(game.events, 'game.start'))
    void enqueue(autoEvents(game, 0, get().calSeed))
  }
  if (first) void enqueue(sceneStart(first))
}

/** Makes the league's world when the game has one and this playthrough has none yet. */
async function prepareWorld(game: GameDoc, id: number) {
  if (!game.league.enabled || get().world) return
  set({ status: 'Getting the cards ready…' })
  try {
    await cardsReady(game)
    if (id !== run) return
    const rng = makeRng(randomInt())
    const league = game.league
    const region = league.names.regions.length ? rng.pick(league.names.regions) : ''
    const world = emptyWorld(rng.seed(), league.playerRating, region)
    world.duelists = startingDuelists(league, rng, leagueCards(game))
    set({ world })
  } finally {
    if (id === run) set({ status: null })
  }
}

export function stopRuntime() {
  reset()
  set({ ...idle })
}

// ---------- saves ----------

function saveLabel(): string {
  const st = get()
  const g = st.game
  const scene = sceneById(st.sceneId)?.name ?? 'No scene'
  const usesWeeks = !!g && (g.calendar.activities.length > 0 || g.calendar.events.length > 0)
  return usesWeeks && g ? `${scene} · ${dateLabel(g.calendar, st.week)}` : scene
}

/** Saves the running game in a slot. */
export async function saveRuntime(slot: SaveSlot): Promise<void> {
  const st = get()
  if (!st.running || !st.game) return
  await writeSave({
    gameId: st.game.id,
    slot,
    savedAt: Date.now(),
    label: saveLabel(),
    snapshot: takeSnapshot(st, seed),
  })
}

/**
 * Autosaves into the game's autosave slots, taking turns: an empty one first, then the
 * oldest. Quietly does nothing without storage or with no autosave slots.
 */
export function autosave() {
  const game = get().game
  if (!game) return
  const slots = autoSlotNames(game.settings)
  if (!slots.length) return
  listSaves(game.id)
    .then((rows) => {
      const at = (s: string) => rows.find((r) => r.slot === s)?.savedAt ?? -1
      const slot = [...slots].sort((a, b) => at(a) - at(b))[0]
      return saveRuntime(slot)
    })
    .catch(() => undefined)
}

/** Puts a saved game back and starts its scene again. */
export function loadSnapshot(game: GameDoc, snap: Snapshot) {
  reset()
  seed = Number(snap.seed) || randomSeed()
  set({ ...idle, ...fromSnapshot(snap), running: true, game })
  void enqueueTask(() => prepareWorld(game, run))
  const scene = get().sceneId
  if (scene && sceneById(scene)) void enqueue(sceneStart(scene))
  else set({ sceneId: game.startScene ?? game.scenes[0]?.id ?? null })
}

export async function loadRuntime(slot: SaveSlot): Promise<boolean> {
  const game = get().game
  if (!game) return false
  const row = await readSave(game.id, slot)
  if (!row) return false
  loadSnapshot(game, row.snapshot)
  return true
}

/** The player clicked an area or an object. Ignored while steps are running. */
export function clickThing(events: GameEvent[]) {
  const st = get()
  if (st.busy || st.message || st.choice || st.screen || st.ended) return
  void enqueue(byCause(events, 'area.click'))
}

/** Back to the previous scene. */
export function backScene() {
  const st = get()
  if (st.busy || !st.trail.length) return
  const prev = st.trail[st.trail.length - 1]
  set({ sceneId: prev, trail: st.trail.slice(0, -1) })
  if (st.game?.settings.autosaveOnScene) autosave()
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
      seed: randomInt(),
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
