/**
 * Card releases and ban updates while a game runs: a release puts cards into
 * circulation, a ban update announces a ban that comes into force some weeks later
 * (the world step applies it). The draw and the pick are the league's pure code;
 * this file connects them to the game's cards, the world state and the screens.
 */
import type { RunContext } from '../events/pieces'
import { drawRelease } from '../league/releases'
import { nextBans } from '../league/step'
import { makeRng } from '../league/rng'
import { line } from './lines'
import { leagueCards } from './leagueCards'
import { randomInt } from './runtime'
import { get, set } from './state'

/** Puts a release out: draws its cards, adds them to circulation, tells the player. */
export async function runRelease(ctx: RunContext, id: string): Promise<void> {
  const game = get().game
  const w = get().world
  const def = game?.league.releases.find((r) => r.id === id)
  if (!game || !w || !def || ctx.stopped()) return
  const cards = leagueCards(game)
  const drawn = drawRelease(def, cards, w.released, makeRng(randomInt()))
  if (!drawn.length) return
  set({
    world: {
      ...w,
      released: [...w.released, ...drawn.filter((c) => !w.released.includes(c))],
      releaseLog: [...w.releaseLog, { week: get().week, release: def.id, name: def.name, cards: drawn }],
    },
  })
  await ctx.showMessage(line('release.new', { count: drawn.length, name: def.name }))
}

/**
 * Announces the next ban update. The ban comes into force `announceWeeks` later.
 * `lift` also lifts every ban in force at that moment.
 */
export async function updateBans(ctx: RunContext, lift: boolean): Promise<void> {
  const game = get().game
  const w = get().world
  if (!game || !w || !game.league.bans.enabled || ctx.stopped()) return
  const rules = game.league.bans
  const add = nextBans(game.league, w)
  const remove = lift ? [...w.banned] : []
  if (!add.length && !remove.length) return
  set({ world: { ...w, pendingBan: { week: get().week + Math.max(0, rules.announceWeeks), add, remove } } })
  const names = new Map(leagueCards(game).map((c) => [c.id, c.name]))
  await ctx.showMessage(
    line('ban.announce', {
      weeks: rules.announceWeeks,
      cards: add.map((id) => names.get(id) ?? id).join(', '),
    }),
  )
}
