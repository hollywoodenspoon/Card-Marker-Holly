import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { useGameCards, type GameCardsState } from '../cards/gameCards'
import { dateOf, eventsOn } from './calendar'
import { adventureScuffleGame } from './adventureTemplate'
import { isAce } from './economy'
import { tidyGame } from './game'
import { answerRuntime, closeScreen, startRuntime, stopRuntime, useRuntime } from '../runtime/runtime'

const tick = async (n = 4) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}

describe('the Adventure Scuffle! template', () => {
  it('survives tidying and keeps its parts wired to real ids', () => {
    const g = adventureScuffleGame()
    const t = tidyGame(JSON.parse(JSON.stringify(g)))
    expect(t.league.enabled).toBe(true)
    expect(t.league.releases[0]?.random).toBe(60)
    expect(t.settings.ending).toMatchObject({ kind: 'years', years: 7 })
    const ids = new Set(t.league.tournaments.map((x) => x.id))
    for (const e of t.calendar.events) {
      if (e.lock) expect(ids.has(String(e.lock.args.tournament))).toBe(true)
    }
    expect(t.economy.money).toBe(t.variables[0]?.id)
  })

  it('knows which cards are Aces ({ace} in Name_AS)', () => {
    const e = adventureScuffleGame().economy
    expect(isAce({ Name_AS: 'Crimson Duelist {ace}' }, e)).toBe(true)
    expect(isAce({ Name_AS: 'Crimson Duelist' }, e)).toBe(false)
  })

  it('has no bans in year one, and the start-of-game release in week one', () => {
    const g = adventureScuffleGame()
    const names = (w: number) => eventsOn(g.calendar, w, 1).map((e) => e.name)
    expect(names(0)).toContain('Starter set')
    const weeksPerYear = 4 * 3 * 4
    expect(dateOf(g.calendar, weeksPerYear).year).toBe(2)
    const ban = g.calendar.events.find((e) => e.name === 'Ban list update')
    expect(ban?.fromYear).toBe(2)
    for (let w = 0; w < weeksPerYear; w++) expect(names(w)).not.toContain('Ban list update')
    expect(names(weeksPerYear + 4)).toContain('Ban list update')
  })

  it('starts: free packs, then the week choices', async () => {
    const g = adventureScuffleGame()
    const cards = Array.from({ length: 80 }, (_, i) => ({
      id: `c${i}`,
      name: `Card ${i}`,
      w: 63,
      h: 88,
      fields: { Name: `c${i}` },
      front: '',
      back: null,
    }))
    useGameCards.setState({
      gameId: g.id,
      status: 'ready',
      merged: { pack: { info: { cards } } },
    } as unknown as Partial<GameCardsState>)
    startRuntime(g)
    // Hint, then three packs, then the deck editor; answer each until the week appears.
    for (let i = 0; i < 20 && useRuntime.getState().screen?.kind !== 'activity'; i++) {
      await tick()
      const st = useRuntime.getState()
      if (st.screen?.kind === 'activity') break
      if (st.screen) closeScreen(0)
      else answerRuntime()
    }
    await tick()
    const sc = useRuntime.getState().screen
    expect(sc?.kind).toBe('activity')
    if (sc?.kind === 'activity') {
      expect(sc.options.map((o) => o.name)).toEqual(
        expect.arrayContaining(['Edit my deck', 'Visit the card shop']),
      )
    }
    stopRuntime()
  })
})
