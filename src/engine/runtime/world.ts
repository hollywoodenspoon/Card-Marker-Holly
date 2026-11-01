/**
 * The player's world while a game runs: dialogue, money, items, the card
 * collection, shops, boosters, "Edit my deck", activities and weeks. It works on
 * the runtime's state (state.ts); the player UI calls the exported actions
 * (buy, sell, deck edits) directly.
 */
import { useGameCards } from '../cards/gameCards'
import { openBooster as roll, type PoolCard } from '../economy/booster'
import {
  addCards,
  addItems,
  clampDeck,
  owned,
  spare,
  takeCards,
  type Collection,
} from '../economy/collection'
import { runSteps, testCondition } from '../events/run'
import type { Owned, RunContext, World } from '../events/pieces'
import { eventsOn, isOn } from '../model/calendar'
import { isAce, rarityKey, type ShopEntry } from '../model/economy'
import type { GameEvent } from '../model/events'
import type { GameDoc } from '../model/game'
import { autoEvents, cardsReady, randomInt, showMessage } from './runtime'
import { closeScreen, get, set, showScreen, type ActivityOption } from './state'

const game = (): GameDoc => {
  const g = get().game
  if (!g) throw new Error('No game is running')
  return g
}

// ---------- money ----------

export function moneyOf(): number {
  const id = get().game?.economy.money
  const v = id ? get().vars[id] : 0
  return typeof v === 'number' ? v : 0
}

function setMoney(n: number) {
  const id = get().game?.economy.money
  if (id) set({ vars: { ...get().vars, [id]: Math.max(0, n) } })
}

// ---------- cards ----------

/** The game's cards as booster pool entries (Ace or not, by the game's setting). */
export function poolCards(only?: Record<string, number> | null): PoolCard[] {
  const g = get().game
  const cards = useGameCards.getState().merged?.pack.info.cards ?? []
  if (!g) return []
  return cards
    .filter((c) => !only || only[c.id])
    .map((c) => ({ id: c.id, ace: isAce(c.fields, g.economy) }))
}

export function cardAce(id: string): boolean {
  const g = get().game
  const c = useGameCards.getState().merged?.pack.info.cards.find((x) => x.id === id)
  return !!g && !!c && isAce(c.fields, g.economy)
}

function count(kind: Owned, id: string): number {
  const st = get()
  if (kind === 'item') return st.inventory[id] ?? 0
  return owned(st.collection, id, kind === 'card' ? 'normal' : kind === 'foil' ? 'foil' : 'any')
}

function give(kind: Owned, id: string, n: number) {
  if (!id || !n) return
  const st = get()
  if (kind === 'item') return set({ inventory: addItems(st.inventory, id, n) })
  let col = st.collection
  if (kind === 'anyCard') col = n > 0 ? addCards(col, id, false, n) : takeCards(col, id, -n).col
  else col = addCards(col, id, kind === 'foil', n)
  set({ collection: col, decks: keepDecksOwned(col) })
}

/** The player's own decks stay within the cards they own. */
function keepDecksOwned(col: Collection) {
  const st = get()
  const decks = { ...st.decks }
  for (const id of st.ownedDecks) if (decks[id]) decks[id] = clampDeck(decks[id], col)
  return decks
}

/** Sets how many copies of a card a deck holds, within what the player owns. */
export function setDeckCard(deckId: string, cardId: string, n: number) {
  const st = get()
  const deck = { ...(st.decks[deckId] ?? {}) }
  const k = Math.max(0, Math.min(n, owned(st.collection, cardId)))
  if (k > 0) deck[cardId] = k
  else delete deck[cardId]
  set({ decks: { ...st.decks, [deckId]: deck } })
}

// ---------- shops ----------

export function entryPrice(e: ShopEntry): number {
  const g = get().game
  if (!g) return 0
  if (e.price !== null) return Math.max(0, e.price)
  if (e.kind === 'item') return g.items.find((i) => i.id === e.ref)?.price ?? 0
  if (e.kind === 'booster') return g.boosters.find((b) => b.id === e.ref)?.price ?? 0
  return 0
}

/** Buys a shop entry. A booster opens straight away. False when the money's short. */
export async function buy(shopId: string, entryId: string): Promise<boolean> {
  const g = game()
  const e = g.shops.find((s) => s.id === shopId)?.sells.find((x) => x.id === entryId)
  if (!e) return false
  const price = entryPrice(e)
  if (moneyOf() < price) return false
  if (e.kind === 'booster') {
    const pack = await rollBooster(e.ref)
    if (!pack) return false
    setMoney(moneyOf() - price)
    const sc = get().screen
    if (sc?.kind === 'shop') set({ screen: { ...sc, pack } })
    return true
  }
  setMoney(moneyOf() - price)
  if (e.kind === 'item') give('item', e.ref, 1)
  else give(e.foil ? 'foil' : 'card', e.ref, 1)
  return true
}

/** What a shop pays for one of the player's items or cards (0: it doesn't buy them). */
export function sellPrice(shopId: string, kind: 'item' | 'card' | 'foil', id: string): number {
  const g = get().game
  const shop = g?.shops.find((s) => s.id === shopId)
  if (!g || !shop) return 0
  if (kind === 'item') {
    const item = g.items.find((i) => i.id === id)
    return item ? Math.floor((item.price * Math.max(0, shop.buyItems)) / 100) : 0
  }
  return Math.max(0, shop.buyCards[rarityKey(cardAce(id), kind === 'foil')] ?? 0)
}

/** Copies the player can sell: items they hold, or cards not needed by their decks. */
export function sellable(kind: 'item' | 'card' | 'foil', id: string): number {
  const st = get()
  if (kind === 'item') return st.inventory[id] ?? 0
  const free = spare(
    st.collection,
    st.ownedDecks.map((d) => st.decks[d] ?? {}),
    id,
  )
  return Math.min(free, owned(st.collection, id, kind === 'foil' ? 'foil' : 'normal'))
}

export function sell(shopId: string, kind: 'item' | 'card' | 'foil', id: string): boolean {
  const price = sellPrice(shopId, kind, id)
  if (price <= 0 || sellable(kind, id) <= 0) return false
  give(kind, id, -1)
  setMoney(moneyOf() + price)
  return true
}

// ---------- boosters ----------

async function rollBooster(id: string) {
  const g = game()
  const b = g.boosters.find((x) => x.id === id)
  if (!b) return null
  await cardsReady(g)
  const pool = poolCards(b.pool ? (get().decks[b.pool] ?? {}) : null)
  const { cards } = roll(b, pool, randomInt())
  let col = get().collection
  for (const c of cards) col = addCards(col, c.id, c.foil, 1)
  set({ collection: col })
  return { booster: b.id, cards }
}

// ---------- weeks ----------

/** This week's choices: activities and activity events (only the forced ones, if any). */
export function weekOptions(ctx: RunContext): { options: ActivityOption[]; forced: boolean } {
  const g = game()
  const { week, calSeed } = get()
  const events = eventsOn(g.calendar, week, calSeed)
  const lock = (c: Parameters<typeof testCondition>[0] | null) => !!c && testCondition(c, ctx)
  const forcedEvents = events.filter((e) => e.mode === 'forced')
  const forcedActs = g.calendar.activities.filter((a) => a.force && testCondition(a.force, ctx))
  const act = (a: (typeof g.calendar.activities)[number]): ActivityOption => ({
    kind: 'activity',
    id: a.id,
    name: a.name,
    description: a.description,
    image: a.image,
    locked: lock(a.lock),
    lockText: a.lockText,
  })
  const ev = (e: (typeof events)[number]): ActivityOption => ({
    kind: 'event',
    id: e.id,
    name: e.name,
    description: e.description,
    image: e.image,
    locked: lock(e.lock),
    lockText: e.lockText,
  })
  if (forcedEvents.length || forcedActs.length)
    return {
      options: [...forcedEvents.map(ev), ...forcedActs.map(act)].map((o) => ({
        ...o,
        locked: false,
      })),
      forced: true,
    }
  return {
    options: [
      ...events.filter((e) => e.mode === 'activity').map(ev),
      ...g.calendar.activities.map(act),
    ],
    forced: false,
  }
}

async function runAll(events: GameEvent[], ctx: RunContext) {
  for (const e of events) await runSteps(e.steps, ctx)
}

// ---------- the world for a run ----------

export function makeWorld(
  ctx: RunContext,
  live: () => boolean,
  weekStart: () => GameEvent[],
): World {
  const wait = async (p: Promise<number>) => (live() ? p : -1)
  const world: World = {
    game,
    say: (character, expression, text) => {
      const c = game().characters.find((x) => x.id === character)
      return showMessage(text, live, {
        character: c?.id ?? null,
        name: c?.name ?? '',
        color: c?.nameColor ?? '#ffffff',
        expression,
      })
    },
    count,
    give,
    openShop: async (id) => {
      if (!game().shops.some((s) => s.id === id)) return
      await cardsReady(game())
      await wait(showScreen({ kind: 'shop', id, pack: null }))
    },
    openBooster: async (id) => {
      const pack = await rollBooster(id)
      if (pack && live()) await wait(showScreen({ kind: 'booster', pack }))
    },
    editDeck: async (deckId) => {
      if (!deckId) return
      await cardsReady(game())
      const st = get()
      set({
        ownedDecks: st.ownedDecks.includes(deckId) ? st.ownedDecks : [...st.ownedDecks, deckId],
        decks: { ...st.decks, [deckId]: clampDeck(st.decks[deckId] ?? {}, st.collection) },
      })
      await wait(showScreen({ kind: 'deck', deckId }))
    },
    showCalendar: async () => void (await wait(showScreen({ kind: 'calendar' }))),
    pickActivity: async () => {
      const { options, forced } = weekOptions(ctx)
      if (options.length && live()) {
        const i = await wait(showScreen({ kind: 'activity', options, forced }))
        const o = options[i]
        if (o && !o.locked) {
          const g = game()
          const steps =
            o.kind === 'activity'
              ? g.calendar.activities.find((a) => a.id === o.id)?.steps
              : g.calendar.events.find((e) => e.id === o.id)?.steps
          await runSteps(steps ?? [], ctx)
        }
      }
      if (live()) await world.nextWeek()
    },
    nextWeek: async () => {
      const week = get().week + 1
      set({ week })
      await runAll(weekStart(), ctx)
      if (live()) await runAll(autoEvents(game(), week, get().calSeed), ctx)
    },
    week: () => get().week,
    isOnThisWeek: (eventId) => {
      const g = game()
      const e = g.calendar.events.find((x) => x.id === eventId)
      return !!e && isOn(g.calendar, e, get().week, get().calSeed)
    },
    endGame: async (text) => {
      closeScreen()
      set({ ended: text || 'The end.', message: null, choice: null, speaker: null })
    },
  }
  return world
}
