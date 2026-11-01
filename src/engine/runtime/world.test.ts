import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { useGameCards, type GameCardsState } from '../cards/gameCards'
import { newActivity, newCalendarEvent } from '../model/calendar'
import { newCharacter, newPortraitTemplate } from '../model/characters'
import { newBooster, newItem, newShop } from '../model/economy'
import { effect, newEvent } from '../model/events'
import { emptyLeague, newRelease } from '../model/league'
import { newDeck, newGame, newPictureScene, newVariable } from '../model/game'
import {
  answerRuntime,
  closeScreen,
  loadRuntime,
  saveRuntime,
  startRuntime,
  stopRuntime,
  useRuntime,
} from './runtime'
import { PLAYER_DECK, buy, deckToEdit, moneyOf, sell, sellable, setDeckCard } from './world'

const tick = async (n = 3) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}
const st = () => useRuntime.getState()

function withCards(gameId: string) {
  const cards = ['a', 'b', 'c', 'A'].map((id) => ({
    id,
    name: `Card ${id}`,
    w: 63,
    h: 88,
    fields: { Name: id === 'A' ? 'Ace {ace}' : id },
    front: '',
    back: null,
  }))
  useGameCards.setState({
    gameId,
    status: 'ready',
    merged: { pack: { info: { cards } } },
  } as unknown as Partial<GameCardsState>)
}

function demo() {
  const g = newGame('World')
  const scene = newPictureScene('Home')
  g.scenes.push(scene)
  g.startScene = scene.id
  const gold = newVariable('Gold', 'number')
  gold.initial = 20
  g.variables.push(gold)
  g.economy = { ...g.economy, money: gold.id, aceField: 'Name', aceText: '{ace}' }
  withCards(g.id)
  return { g, scene, gold }
}

describe('the player’s world', () => {
  it('a character says text with variables, and it goes in the log', async () => {
    const { g, scene } = demo()
    const t = newPortraitTemplate()
    g.portraits.push(t)
    const ana = newCharacter('Ana', t)
    ana.nameColor = '#ff0000'
    g.characters.push(ana)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(
      effect('say', { character: ana.id, expression: 'Happy', text: 'You have {gold}.' }),
    )
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    expect(st().message).toBe('You have 20.')
    expect(st().speaker).toMatchObject({ name: 'Ana', color: '#ff0000', expression: 'Happy' })
    answerRuntime()
    expect(st().log).toEqual([{ name: 'Ana', color: '#ff0000', text: 'You have 20.' }])
    stopRuntime()
  })

  it('shops sell items, cards and boosters, and buy back spare copies', async () => {
    const { g, scene } = demo()
    const potion = newItem('Potion')
    potion.price = 5
    const pack = newBooster('Pack')
    pack.price = 10
    const shop = newShop('Corner shop')
    shop.sells.push(
      { id: 'e1', kind: 'item', ref: potion.id, price: null },
      { id: 'e2', kind: 'booster', ref: pack.id, price: null },
      { id: 'e3', kind: 'card', ref: 'A', foil: true, price: 50 },
    )
    g.items.push(potion)
    g.boosters.push(pack)
    g.shops.push(shop)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('shop.open', { shop: shop.id }), effect('message.show', { text: 'Bye' }))
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    expect(st().screen).toMatchObject({ kind: 'shop', id: shop.id })
    expect(await buy(shop.id, 'e1')).toBe(true)
    expect(moneyOf()).toBe(15)
    expect(st().inventory[potion.id]).toBe(1)
    expect(await buy(shop.id, 'e3')).toBe(false)
    expect(await buy(shop.id, 'e2')).toBe(true)
    expect(moneyOf()).toBe(5)
    const opened = st().screen
    expect(opened?.kind === 'shop' && opened.pack?.cards.length).toBe(3)
    const total = Object.values(st().collection).reduce((n, c) => n + c.normal + c.foil, 0)
    expect(total).toBe(3)
    // Selling an item at half price.
    expect(sell(shop.id, 'item', potion.id)).toBe(true)
    expect(moneyOf()).toBe(7)
    closeScreen()
    await tick()
    expect(st().message).toBe('Bye')
    stopRuntime()
  })

  it('“Edit my deck” keeps decks to owned cards, and selling keeps deck copies', async () => {
    const { g, scene } = demo()
    const mine = newDeck('My deck')
    const start = newDeck('Starter', { a: 3, b: 1 })
    g.decks.push(mine, start)
    g.economy.startingCards = start.id
    const shop = newShop('Shop')
    g.shops.push(shop)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('deck.edit', { deck: mine.id }))
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    expect(st().screen).toMatchObject({ kind: 'deck', deckId: mine.id })
    setDeckCard(mine.id, 'a', 5)
    setDeckCard(mine.id, 'c', 1)
    expect(st().decks[mine.id]).toEqual({ a: 3 })
    setDeckCard(mine.id, 'a', 2)
    expect(sellable('card', 'a')).toBe(1)
    expect(sell(shop.id, 'card', 'a')).toBe(true)
    expect(sell(shop.id, 'card', 'a')).toBe(false)
    expect(st().collection.a).toEqual({ normal: 2, foil: 0 })
    stopRuntime()
  })

  it('“Edit my deck” works with no deck made yet, using the player’s own', async () => {
    const { g, scene } = demo()
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('cards.giveSet', { cards: 'a*2,b' }), effect('deck.edit', {}))
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    expect(st().screen).toMatchObject({ kind: 'deck', deckId: PLAYER_DECK })
    setDeckCard(PLAYER_DECK, 'a', 5)
    expect(st().decks[PLAYER_DECK]).toEqual({ a: 2 })
    expect(st().ownedDecks).toEqual([PLAYER_DECK])
    stopRuntime()
  })

  it('a deck that was picked but no longer exists falls back to the player’s own', () => {
    const g = newGame('Decks')
    const d = newDeck('Mine')
    g.decks.push(d)
    expect(deckToEdit(g, d.id)).toBe(d.id)
    expect(deckToEdit(g, 'gone')).toBe(PLAYER_DECK)
    expect(deckToEdit(g, '')).toBe(PLAYER_DECK)
  })

  it('gives several boosters, one reveal after the other', async () => {
    const { g, scene } = demo()
    const pack = newBooster('Pack')
    g.boosters.push(pack)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(
      effect('booster.open', { booster: pack.id, count: 3 }),
      effect('message.show', { text: 'Done' }),
    )
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    for (let i = 0; i < 3; i++) {
      expect(st().screen).toMatchObject({ kind: 'booster' })
      closeScreen()
      await tick()
    }
    expect(st().message).toBe('Done')
    const total = Object.values(st().collection).reduce((n, c) => n + c.normal + c.foil, 0)
    expect(total).toBe(9)
    stopRuntime()
  })

  it('an old booster step with no count still opens one', async () => {
    const { g, scene } = demo()
    const pack = newBooster('Pack')
    g.boosters.push(pack)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('booster.open', { booster: pack.id }), effect('message.show', { text: 'Done' }))
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    closeScreen()
    await tick()
    expect(st().message).toBe('Done')
    stopRuntime()
  })

  it('gives chosen cards, random ones from a list, and lets the player choose', async () => {
    const { g, scene } = demo()
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(
      effect('cards.giveSet', { cards: 'a*2,b' }),
      effect('cards.giveRandom', { count: 4, cards: 'c' }),
      effect('cards.choose', { count: 2, cards: 'a,b,A' }),
      effect('message.show', { text: 'Done' }),
    )
    scene.events.push(ev)
    startRuntime(g)
    await tick(6)
    // First choice: Card a, then (a is gone from the list) Card A.
    expect(st().choice?.options).toEqual(['Card a', 'Card b', 'Card A'])
    answerRuntime(0)
    await tick(6)
    expect(st().choice?.options).toEqual(['Card b', 'Card A'])
    answerRuntime(1)
    await tick(6)
    expect(st().message).toBe('Done')
    const col = st().collection
    expect(col.a).toEqual({ normal: 3, foil: 0 })
    expect(col.b).toEqual({ normal: 1, foil: 0 })
    expect(col.c).toEqual({ normal: 4, foil: 0 })
    expect(col.A).toEqual({ normal: 1, foil: 0 })
    stopRuntime()
  })

  it('gives random cards from every card in the game, normal or foil', async () => {
    const { g, scene } = demo()
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(
      effect('cards.giveAny', { count: 6, which: 'card' }),
      effect('cards.giveAny', { count: 2, which: 'foil' }),
      effect('cards.giveSet', { which: 'foil', cards: 'a' }),
    )
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    const col = Object.values(st().collection)
    expect(col.reduce((n, c) => n + c.normal, 0)).toBe(6)
    expect(col.reduce((n, c) => n + c.foil, 0)).toBe(3)
    stopRuntime()
  })

  it('draws a number of cards by a booster’s pool and chances', async () => {
    const { g, scene } = demo()
    const pack = newBooster('Pack')
    g.boosters.push(pack)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('cards.fromBooster', { booster: pack.id, count: 5 }))
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    const sc = st().screen
    expect(sc?.kind === 'booster' && sc.pack.cards.length).toBe(5)
    const total = Object.values(st().collection).reduce((n, c) => n + c.normal + c.foil, 0)
    expect(total).toBe(5)
    stopRuntime()
  })

  it('weeks: pick an activity, then the weekly tick and auto events run', async () => {
    const { g, scene, gold } = demo()
    const grounded = newVariable('Grounded', 'flag')
    grounded.initial = true
    g.variables.push(grounded)
    const study = newActivity('Study')
    study.steps.push(effect('money.change', { op: 'take', value: 1 }))
    const locals = newCalendarEvent('Locals')
    locals.lock = { piece: 'flag.is', args: { flag: grounded.id, state: 'on' } }
    locals.lockText = 'Grounded'
    const news = newCalendarEvent('News')
    news.mode = 'auto'
    news.when = { kind: 'monthWeek', week: 2 }
    news.steps.push(effect('message.show', { text: 'Week {week}' }))
    g.calendar.activities.push(study)
    g.calendar.events.push(locals, news)
    const tickEv = newEvent({ piece: 'week.start', args: {} })
    tickEv.steps.push(effect('money.change', { op: 'give', value: 10 }))
    g.events.push(tickEv)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('week.pick'))
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    const sc = st().screen
    expect(sc?.kind).toBe('activity')
    if (sc?.kind !== 'activity') return
    expect(sc.options.map((o) => [o.name, o.locked])).toEqual([
      ['Locals', true],
      ['Study', false],
    ])
    closeScreen(1)
    await tick()
    expect(st().week).toBe(1)
    expect(st().vars[gold.id]).toBe(29)
    expect(st().message).toBe('Week 2')
    stopRuntime()
  })

  it('forced events are the only choice that week', async () => {
    const { g, scene } = demo()
    const exam = newCalendarEvent('Exam')
    exam.mode = 'forced'
    g.calendar.activities.push(newActivity('Study'))
    g.calendar.events.push(exam)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('week.pick'))
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    const sc = st().screen
    expect(sc?.kind === 'activity' && sc.options.map((o) => o.name)).toEqual(['Exam'])
    expect(sc?.kind === 'activity' && sc.forced).toBe(true)
    stopRuntime()
  })

  it('ends the game', async () => {
    const { g, scene } = demo()
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(
      effect('game.end', { text: 'You won Worlds!' }),
      effect('message.show', { text: 'x' }),
    )
    scene.events.push(ev)
    startRuntime(g)
    await tick()
    expect(st().ended).toBe('You won Worlds!')
    expect(st().message).toBeNull()
    stopRuntime()
  })

  it('a release puts cards in circulation and a ban update is announced ahead', async () => {
    const { g, scene } = demo()
    const rel = newRelease('Set 1')
    rel.fixed = ['a', 'b']
    rel.random = 0
    g.league = { ...emptyLeague(), enabled: true, releases: [rel] }
    g.league.bans = { ...g.league.bans, enabled: true, announceWeeks: 3, handBanned: ['c'] }
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(
      effect('release.run', { release: rel.id }),
      effect('ban.update', { lift: 'keep' }),
    )
    scene.events.push(ev)
    startRuntime(g)
    await tick(8)
    expect(st().message).toBe('2 new cards are out: Set 1.')
    expect(st().world?.released).toEqual(['a', 'b'])
    answerRuntime()
    await tick(4)
    expect(st().message).toBe('Ban list update in 3 weeks.')
    expect(st().world?.pendingBan).toEqual({ week: st().week + 3, add: ['c'], remove: [] })
    expect(st().world?.banned).toEqual([])
    answerRuntime()
    stopRuntime()
  })

  it('the world step runs at the week change: an announced ban comes into force', async () => {
    const { g: g2, scene: s2 } = demo()
    g2.league = { ...emptyLeague(), enabled: true }
    const ev2 = newEvent({ piece: 'scene.start', args: {} })
    ev2.steps.push(effect('message.show', { text: 'Wait' }), effect('week.next', {}))
    s2.events.push(ev2)
    startRuntime(g2)
    await tick(8)
    expect(st().message).toBe('Wait')
    const w = st().world!
    useRuntime.setState({ world: { ...w, pendingBan: { week: 1, add: ['c'], remove: [] } } })
    answerRuntime()
    await tick(12)
    expect(st().world?.banned).toEqual(['c'])
    expect(st().message).toBe('The ban list changed: Card c.')
    answerRuntime()
    await tick(8)
    expect(st().week).toBe(1)
    stopRuntime()
  })

  it('saves and loads a slot', async () => {
    const { g, gold } = demo()
    startRuntime(g)
    await tick()
    useRuntime.setState({ vars: { [gold.id]: 99 }, week: 5, inventory: { x: 2 } })
    await saveRuntime('1')
    useRuntime.setState({ vars: { [gold.id]: 0 }, week: 9, inventory: {} })
    expect(await loadRuntime('1')).toBe(true)
    expect(st().vars[gold.id]).toBe(99)
    expect(st().week).toBe(5)
    expect(st().inventory).toEqual({ x: 2 })
    expect(await loadRuntime('2')).toBe(false)
    stopRuntime()
  })
})
