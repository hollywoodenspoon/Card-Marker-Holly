/**
 * The world step at a week change: duelists play, ratings drift, bans come into
 * force, prices and stock move. The work is the league's pure `stepWeek`; this
 * file feeds it the game's cards, booster and stock rules, shows a status line while
 * it runs, and tells the player any news afterwards.
 */
import type { RunContext } from '../events/pieces'
import { stepWeek } from '../league/step'
import { line } from './lines'
import { leagueCards } from './leagueCards'
import { cardsReady } from './runtime'
import { get, set } from './state'

const frame = () => new Promise<void>((r) => setTimeout(r, 0))

/** Runs the step for the week that is ending. Does nothing when the game has no league world or the step is off. */
export async function runWeekStep(ctx: RunContext, week: number): Promise<void> {
  const game = get().game
  const w = get().world
  if (!game || !w || ctx.stopped()) return
  if (!game.league.enabled || game.settings.worldStep !== 'weekChange') return
  await cardsReady(game)
  if (ctx.stopped()) return
  const show = (part: number) =>
    set({ status: `${line('world.step')} ${Math.round(part * 100)}%` })
  set({ stepping: true })
  show(0)
  await frame()
  try {
    const stock: Record<string, { max: number; refill: number }> = {}
    for (const shop of game.shops)
      for (const e of shop.sells) if (e.stock) stock[`${shop.id}:${e.id}`] = e.stock
    const market = game.league.market
    const out = stepWeek({
      world: get().world ?? w,
      league: game.league,
      calendar: game.calendar,
      calSeed: get().calSeed,
      cards: leagueCards(game),
      week,
      booster: market.booster ? game.boosters.find((b) => b.id === market.booster) : undefined,
      stock,
      progress: show,
    })
    show(1)
    await frame()
    if (ctx.stopped()) return
    set({ world: { ...out.world, active: get().world?.active ?? null } })
    for (const n of out.news) {
      if (ctx.stopped()) break
      await ctx.showMessage(line(n.key, n.vars))
    }
  } finally {
    set({ stepping: false, status: null })
  }
}
