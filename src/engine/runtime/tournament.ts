/**
 * Playing a league tournament in a running game. The player is entered, their
 * matches are played on Play's table (best of N, a forfeit counts as a loss), and
 * every other match is settled by rating, a round at a time. Once the player is
 * out they can watch round by round or skip to the results. The bracket itself
 * is the league's pure code (league/bracket.ts); this file only connects it to
 * the screens, the table and the world state.
 */
import { runSteps } from '../events/run'
import type { RunContext } from '../events/pieces'
import {
  alive,
  openMatches,
  settle,
  settleAll,
  settleRound,
  type BMatch,
} from '../league/bracket'
import { makeRng } from '../league/rng'
import {
  buildField,
  contendersOf,
  createFor,
  entryFor,
  finishTourney,
  PLAYER,
} from '../league/tournaments'
import { bannedIn, type ActiveTournament } from '../league/worldState'
import { deckList } from '../model/game'
import { money } from '../model/economy'
import { levelOf } from '../model/league'
import { line } from './lines'
import { leagueCards } from './leagueCards'
import { playMatchGame, randomInt } from './runtime'
import { get, set, showScreen } from './state'

const active = () => get().world?.active ?? null

function patch(p: Partial<ActiveTournament>) {
  const w = get().world
  if (w?.active) set({ world: { ...w, active: { ...w.active, ...p } } })
}

/** Runs the steps of every event the game attaches to a cause (a blank tournament matches all). */
async function fire(ctx: RunContext, cause: string, tournament: string) {
  for (const e of ctx.world?.game().events ?? []) {
    if (e.cause.piece !== cause) continue
    const only = e.cause.args.tournament
    if (only && only !== tournament) continue
    await runSteps(e.steps, ctx)
  }
}

/** Whether the player may enter now (points, invite). */
export function canEnter(tournament: string): boolean {
  const g = get().game
  const w = get().world
  const def = g?.league.tournaments.find((t) => t.id === tournament)
  return !!def && !!w && entryFor(def, w, get().week).ok
}

/** Enters the player in a tournament with a deck and plays it to the end. */
export async function runTournament(
  ctx: RunContext,
  o: { tournament: string; deck: string; placeVar: string },
): Promise<void> {
  const game = get().game
  const w = get().world
  if (!game || !w || ctx.stopped()) return
  const def = game.league.tournaments.find((t) => t.id === o.tournament)
  if (!def) return
  const entry = entryFor(def, w, get().week)
  if (!entry.ok) {
    return ctx.showMessage(
      entry.reason === 'points'
        ? line('tourney.notEnough', { n: entry.need ?? 0 })
        : line('tourney.notInvited'),
    )
  }
  const mine = deckList({ counts: get().decks[o.deck] ?? {} })
  if (!mine.length) return ctx.showMessage(line('tourney.noDeck'))
  const banned = bannedIn(w, mine)
  if (banned.length) {
    const names = new Map(leagueCards(game).map((c) => [c.id, c.name]))
    return ctx.showMessage(
      line('tourney.illegal', { cards: banned.map((id) => names.get(id) ?? id).join(', ') }),
    )
  }

  const rng = makeRng(randomInt())
  const field = buildField(def, game.league, w, Math.max(1, def.players - 1), rng, leagueCards(game))
  const ids = [PLAYER, ...field.ids]
  const tourney = createFor(def, contendersOf(field.world, ids), rng.seed())
  set({
    world: {
      ...field.world,
      active: {
        defId: def.id,
        name: def.name,
        tourney,
        deckId: o.deck,
        week: get().week,
        phase: 'play',
        placeVar: o.placeVar || undefined,
        current: null,
      },
    },
  })
  await carryOn(ctx)
}

/** Picks up a tournament a saved game was in (an unfinished game is played again). */
export async function resumeTournament(ctx: RunContext): Promise<void> {
  if (active() && !ctx.stopped()) await carryOn(ctx)
}

const isMine = (m: BMatch) => m.b !== null && (m.a === PLAYER || m.b === PLAYER)

async function carryOn(ctx: RunContext) {
  for (let guard = 0; guard < 2000 && !ctx.stopped(); guard++) {
    const a = active()
    if (!a) return
    const t = a.tourney
    if (t.done) break
    const playing = a.phase === 'play' && alive(t, PLAYER)
    if (!playing) {
      // Watching: one round at a time, or straight to the end.
      patch({ phase: 'spectate', current: null })
      const pick = await showScreen({ kind: 'tournament' })
      if (ctx.stopped()) return
      patch({ tourney: pick === 0 ? settleRound(t) : settleAll(t) })
      continue
    }
    const rest = settleRound(t, isMine)
    patch({ tourney: rest })
    const m = openMatches(rest).find(isMine)
    if (!m) {
      // Nothing of the player's left to play: settle whatever is open.
      if (!rest.done) patch({ tourney: settleAll(rest) })
      continue
    }
    const stop = await playMatch(ctx, m)
    if (stop) return
  }
  if (!ctx.stopped()) await conclude(ctx)
}

/** Plays the player's match, game after game. True when the run was stopped. */
async function playMatch(ctx: RunContext, m: BMatch): Promise<boolean> {
  const game = get().game!
  const opp = m.a === PLAYER ? m.b! : m.a
  const need = Math.ceil(m.bestOf / 2)
  const duelist = get().world?.duelists.find((d) => d.id === opp)
  const bot = (duelist && levelOf(game.league, duelist.rating)?.bot) || 'normal'
  const mine = deckList({ counts: get().decks[active()!.deckId] ?? {} })
  const theirs = duelist?.deck ?? []
  const prior = active()!.current
  let score: [number, number] = prior?.matchId === m.id ? prior.score : [0, 0]
  let forfeit = false
  while (score[0] < need && score[1] < need) {
    patch({ current: { matchId: m.id, score } })
    const pick = await showScreen({ kind: 'tournament' })
    if (ctx.stopped()) return true
    if (pick === 1) {
      forfeit = true
      break
    }
    if (pick !== 0) continue
    const res = await playMatchGame(game, [mine, theirs], [line('tourney.you'), duelist?.name ?? '?'], bot, { matchId: m.id })
    if (ctx.stopped()) return true
    if (!res.finished) continue
    score = res.winner === 0 ? [score[0] + 1, score[1]] : [score[0], score[1] + 1]
  }
  const a = active()
  if (!a) return false
  const winner = forfeit || score[1] >= need ? opp : PLAYER
  const oriented: [number, number] | undefined = forfeit
    ? undefined
    : m.a === PLAYER
      ? score
      : [score[1], score[0]]
  patch({ tourney: settle(a.tourney, m.id, winner, oriented, forfeit), current: null })
  return false
}

/** The tournament is over: ratings, points and prize, the results screen, the place. */
async function conclude(ctx: RunContext) {
  const game = get().game
  const w = get().world
  const a = active()
  if (!game || !w || !a) return
  const def = game.league.tournaments.find((t) => t.id === a.defId)
  if (!def) return void set({ world: { ...w, active: null } })
  const deck = deckList({ counts: get().decks[a.deckId] ?? {} })
  const out = finishTourney(def, game.league, w, a.tourney, a.week, deck)
  set({ world: { ...out.world, active: { ...a, phase: 'done', current: null } } })
  const moneyVar = game.economy.money
  if (out.prize > 0 && moneyVar) {
    const cur = get().vars[moneyVar]
    ctx.setVar(moneyVar, (typeof cur === 'number' ? cur : 0) + out.prize)
  }
  if (a.placeVar) ctx.setVar(a.placeVar, out.place)
  await showScreen({ kind: 'tournament' })
  const after = get().world
  if (after) set({ world: { ...after, active: null } })
  if (ctx.stopped()) return
  if (out.place > 0) {
    const text = line(out.place === 1 ? 'tourney.won' : 'tourney.placed', {
      name: def.name,
      place: out.place,
    })
    const prize = out.prize > 0 ? `\n${line('tourney.prize', { money: money(out.prize, game.economy) })}` : ''
    await ctx.showMessage(text + prize)
  }
  await fire(ctx, 'tournament.end', def.id)
}
