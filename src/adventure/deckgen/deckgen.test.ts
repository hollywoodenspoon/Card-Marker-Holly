import { describe, expect, it } from 'vitest'
import { checkDeck } from '../deck'
import { FIRST_QUEST, FIRST_QUEST_DECKS, fq } from '../fixtures/firstQuest'
import { buildDeck, deckScore, synergyBonus, wantedArchetypes, type Values } from './build'
import { climb, playGauntlet } from './climb'
import { fitValues, leaguePlan, playLeague, randomDeck } from './values'

const byId = Object.fromEntries(FIRST_QUEST.map((c) => [c.id, c]))
// Made-up values: higher card numbers are better.
const values: Values = Object.fromEntries(FIRST_QUEST.map((c, i) => [c.id, i / 45 - 0.5]))
const legal = (ids: string[]) => checkDeck(ids, byId).ok

describe('the deck auto-builder', () => {
  it('builds legal decks at every level, the same for a seed', () => {
    for (const seed of [1, 2, 3]) {
      expect(legal(randomDeck(FIRST_QUEST, seed)[0])).toBe(true)
      for (const level of ['suboptimal', 'optimal'] as const) {
        const d = buildDeck(FIRST_QUEST, values, level, seed)
        expect(legal(d.cards)).toBe(true)
        expect(buildDeck(FIRST_QUEST, values, level, seed)).toEqual(d)
      }
    }
  })

  it('values an optimal deck above a suboptimal one', () => {
    const bonus = synergyBonus(values)
    const score = (ids: string[]) => deckScore(ids, byId, values, bonus)
    for (const seed of [1, 2, 3, 4]) {
      const opt = buildDeck(FIRST_QUEST, values, 'optimal', seed)
      const sub = buildDeck(FIRST_QUEST, values, 'suboptimal', seed)
      expect(score(opt.cards)).toBeGreaterThan(score(sub.cards))
    }
  })

  it('counts archetype synergy only when the deck has the archetype', () => {
    // Grave Jackal asks for a Grave card on the field.
    const jackal = byId[fq(26)]
    expect(wantedArchetypes(jackal, FIRST_QUEST)).toContain('grave')
    const flat: Values = Object.fromEntries(FIRST_QUEST.map((c) => [c.id, 0]))
    const others = FIRST_QUEST.filter((c) => !c.archetypes.length && !c.ace).slice(0, 11)
    const graves = FIRST_QUEST.filter((c) => c.archetypes.includes('Grave') && c.id !== jackal.id)
    const none = [jackal.id, ...others.map((c) => c.id)]
    const two = [jackal.id, graves[0].id, graves[1].id, ...others.slice(0, 9).map((c) => c.id)]
    expect(deckScore(none, byId, flat, 1)).toBe(0)
    expect(deckScore(two, byId, flat, 1)).toBeGreaterThanOrEqual(1)
  })

  it('fits values that favour a card that always wins', () => {
    const plan = leaguePlan(FIRST_QUEST, 30, 400, 7)
    const star = FIRST_QUEST[5].id
    // Fake results: the deck holding the star wins; otherwise a coin.
    const results = plan.games.map((g, i) => {
      const a = plan.decks[g.a].includes(star)
      const b = plan.decks[g.b].includes(star)
      const winner: 0 | 1 = a && !b ? 0 : b && !a ? 1 : ((i % 2) as 0 | 1)
      return { ...g, winner }
    })
    const v = fitValues(
      FIRST_QUEST.map((c) => c.id),
      plan.decks,
      results,
    )
    const best = Object.entries(v).sort((x, y) => y[1] - x[1])[0][0]
    expect(best).toBe(star)
  })

  it('plays league games and a gauntlet with real bots', () => {
    const plan = leaguePlan(FIRST_QUEST, 6, 4, 3)
    const r = playLeague(FIRST_QUEST, plan.decks, plan.games)
    expect(r).toHaveLength(4)
    const [w, n] = playGauntlet(
      FIRST_QUEST,
      Object.values(FIRST_QUEST_DECKS)[0],
      [Object.values(FIRST_QUEST_DECKS)[1]],
      [1],
      'easy',
    )
    expect(n).toBe(2)
    expect(w).toBeGreaterThanOrEqual(0)
  }, 60_000)

  it('climbs: never keeps a worse deck', async () => {
    const start = buildDeck(FIRST_QUEST, values, 'optimal', 1).cards
    const scores: number[] = []
    // A made-up evaluator: the sum of the made-up values.
    const evaluate = async (d: string[]) => d.reduce((a, id) => a + values[id], 0)
    const r = await climb(start, FIRST_QUEST, values, {
      steps: 30,
      seed: 4,
      evaluate,
      onStep: (_, best) => scores.push(best.score),
    })
    expect(legal(r.deck)).toBe(true)
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1])
    expect(r.score).toBeGreaterThanOrEqual(await evaluate(start))
  })
})
