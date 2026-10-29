import { describe, expect, it } from 'vitest'
import { checkDeck } from '../deck'
import { rulesOf } from '../effects/registry'
import { ARCHIVE_SETS } from '../fixtures/archiveSets'
import { FIRST_QUEST, FIRST_QUEST_DECKS } from '../fixtures/firstQuest'
import { tiers } from './analyze'
import { coverageDecks, randomPairings } from './decks'
import { mergeSlices, playSlice } from './play'
import { labReport } from './report'
import { prefixes, runLab, type LabExec } from './run'

const byId = Object.fromEntries([...FIRST_QUEST, ...ARCHIVE_SETS].map((c) => [c.id, c]))
const premades = Object.entries(FIRST_QUEST_DECKS).map(([name, cards]) => ({ name, cards }))
/** Plays every slice right here, as the workers would. */
const exec: LabExec = async (_stage, slices) => slices.map(playSlice)

describe('the Balance lab', () => {
  it('builds legal decks that hold every card about equally often', () => {
    const pool = [...FIRST_QUEST, ...ARCHIVE_SETS]
    const decks = coverageDecks(pool, 120, 7)
    expect(decks).toHaveLength(120)
    for (const d of decks) expect(checkDeck(d, byId).ok, d.join()).toBe(true)
    const count = new Map<string, number>()
    for (const d of decks) for (const id of d) count.set(id, (count.get(id) ?? 0) + 1)
    expect(count.size).toBe(pool.length)
    const n = [...count.values()]
    // 120 × 12 / 84 ≈ 17 each: dealt in turn, so no card is far off.
    expect(Math.max(...n) - Math.min(...n)).toBeLessThanOrEqual(3)
  })

  it('adds up slices to the same totals as one big slice', { timeout: 30_000 }, () => {
    const decks = coverageDecks(FIRST_QUEST, 10, 3)
    const games = randomPairings(decks.length, 40, 5, 10)
    const one = playSlice({ cards: FIRST_QUEST, decks, games, bot: 'quick' })
    const parts = [0, 10, 20, 30].map((i) =>
      playSlice({ cards: FIRST_QUEST, decks, games: games.slice(i, i + 10), bot: 'quick' }),
    )
    expect(mergeSlices(parts)).toEqual(one)
    expect(one.checked).toBe(4)
    expect(one.problems).toEqual([])
  })

  it(
    'counts Battle bonuses, Rest reveals and Final Blow as ability uses',
    { timeout: 30_000 },
    () => {
      const pool = [...FIRST_QUEST, ...ARCHIVE_SETS]
      const decks = coverageDecks(pool, 40, 11)
      const r = playSlice({
        cards: pool,
        decks,
        games: randomPairings(40, 150, 9, 0),
        bot: 'quick',
      })
      const used = (pick: (id: string) => boolean) => {
        const ids = pool.map((c) => c.id).filter(pick)
        return [ids.length, ids.filter((id) => (r.uses[id]?.[1] ?? 0) > 0).length]
      }
      const rules = (id: string) => rulesOf({ cards: byId }, id)
      for (const [all, seen] of [
        used((id) => !!(rules(id)?.fs || rules(id)?.fsCoin)),
        used((id) => !!rules(id)?.restFs),
        used((id) => !!rules(id)?.finalBlow),
      ]) {
        expect(all).toBeGreaterThan(0)
        // Many come up in 150 games; before, none of them were ever counted.
        expect(seen).toBeGreaterThan(all / 3)
      }
    },
  )

  it('tiers cards by rank', () => {
    const v = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`c${i}`, i]))
    const t = tiers(v)
    expect(t.c9).toBe('S')
    expect([t.c8, t.c7]).toEqual(['A', 'A'])
    expect(t.c0).toBe('D')
  })

  it('finds the code prefixes', () => {
    expect(prefixes([...FIRST_QUEST, ...ARCHIVE_SETS])[0]).toEqual(['TFQ', 45])
  })

  it('runs every stage on the core set and the full pool', { timeout: 120_000 }, async () => {
    const cards = [...FIRST_QUEST, ...ARCHIVE_SETS]
    const r = await runLab(
      { packName: 'Test', cards, premades },
      { games: 800, bot: 'quick', seed: 11, core: ['TFQ'] },
      exec,
    )
    expect(r.views.map((v) => v.id)).toEqual(['core', 'full'])
    expect(r.played.cards + r.played.constructed + r.played.premades).toBe(800)
    expect(r.views[0].cards).toHaveLength(FIRST_QUEST.length)
    expect(r.views[1].cards).toHaveLength(cards.length)
    expect(r.views[1].coreRange).toBeDefined()
    // Every view auto-builds decks, and the premades play a matrix.
    for (const v of r.views)
      expect(v.constructed.decks.some((d) => d.kind === 'optimal')).toBe(true)
    expect(r.premades?.decks).toHaveLength(premades.length)
    expect(r.checked).toBeGreaterThan(0)
    expect(r.problems).toEqual([])
    // Core-set suggestions come first.
    const ranks = r.suggestions.map((s) => s.rank)
    expect([...ranks].sort()).toEqual(ranks)
    const md = labReport(r, cards)
    expect(md).toContain('## Core set alone')
    expect(md).toContain('## Premade decks')
  })

  // Plays a real slice of bot games: well under a second locally, but past the
  // 5 s default on a loaded CI runner, so it gets the same headroom as its neighbours.
  it('keeps what was played when stopped', { timeout: 30_000 }, async () => {
    let calls = 0
    const r = await runLab(
      { packName: 'Test', cards: FIRST_QUEST, premades },
      { games: 300, bot: 'quick', seed: 2, core: ['TFQ'] },
      async (_s, slices) => {
        calls++
        return slices.map((x, i) => (i === 0 ? playSlice(x) : undefined))
      },
      () => calls > 0,
    )
    expect(r.stopped).toBe(true)
    expect(calls).toBe(1)
    expect(r.played.cards).toBe(50)
    expect(r.views[0].cards).toHaveLength(FIRST_QUEST.length)
  })
})
