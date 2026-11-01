/**
 * The first game's starting point: "Adventure Scuffle!" wired together so it can be
 * opened, played and changed. It is only data, the same data a new game is built
 * from by hand: a money number, the league with its tournaments, a calendar of
 * releases, bans and tournaments, a shop, a booster, activities and a few tutorial
 * hints. Nothing here is a rule of the engine; every part can be edited or removed.
 */
import {
  newActivity,
  newCalendarEvent,
  type CalendarEvent,
  type Activity,
} from './calendar'
import { newBooster, newShop } from './economy'
import { effect, newEvent, type Step } from './events'
import { newDeck, newGame, newPictureScene, newVariable, type GameDoc } from './game'
import { adventureLeague } from './league'

export function adventureScuffleGame(name = 'Adventure Scuffle!'): GameDoc {
  const g = newGame(name)

  // The start scene (a plain picture the designer replaces with a real one).
  const home = newPictureScene('Home')
  g.scenes.push(home)
  g.startScene = home.id

  // Money, and the number the tournaments put the player's place in.
  const gold = newVariable('Gold', 'number')
  gold.initial = 30
  const place = newVariable('Place', 'number')
  g.variables.push(gold, place)
  g.economy = { ...g.economy, money: gold.id, unit: 'gold' }

  // The player's deck, a booster and a shop that sells it.
  const mine = newDeck('My deck')
  g.decks.push(mine)
  const booster = newBooster('Scuffle pack')
  g.boosters.push(booster)
  const shop = newShop('Card shop')
  shop.sells.push({
    id: `${shop.id}-booster`,
    kind: 'booster',
    ref: booster.id,
    price: null,
  })
  g.shops.push(shop)

  // The league, with the first game's numbers as plain data.
  g.league = adventureLeague()
  g.league.market.booster = booster.id
  const [starter, season] = g.league.releases
  if (starter) starter.random = 60
  if (season) season.random = 6
  g.league.bans.enabled = true

  const byName = (n: string) => g.league.tournaments.find((t) => t.name === n)
  const enter = (n: string): Step[] => {
    const t = byName(n)
    return t ? [effect('tournament.run', { tournament: t.id, deck: mine.id, placeVar: place.id })] : []
  }

  // The weekly choices.
  const edit = newActivity('Edit my deck')
  edit.description = 'Build the deck you take to tournaments.'
  edit.steps.push(effect('deck.edit', { deck: mine.id }))
  const visit = newActivity('Visit the card shop')
  visit.description = 'Buy boosters and sell spare cards.'
  visit.steps.push(effect('shop.open', { shop: shop.id }))
  const rest = newActivity('Rest')
  rest.description = 'Take the week easy.'
  rest.steps.push(effect('money.change', { op: 'give', value: 5 }))
  const work = newActivity('Odd jobs')
  work.description = 'Earn some gold.'
  work.steps.push(effect('money.change', { op: 'give', value: 12 }))
  const activities: Activity[] = [edit, visit, work, rest]

  // Releases and bans: separate calendar events with their own schedules.
  const auto = (
    n: string,
    o: Partial<CalendarEvent>,
    steps: Step[],
  ): CalendarEvent => ({ ...newCalendarEvent(n), mode: 'auto', ...o, steps })
  const events: CalendarEvent[] = []
  if (starter)
    events.push(
      auto('Starter set', { when: { kind: 'once', year: 1, week: 1 } }, [
        effect('release.run', { release: starter.id }),
      ]),
    )
  if (season)
    events.push(
      auto(
        'Season release',
        { when: { kind: 'seasonWeek', week: 1 }, seasons: [], fromYear: 1, announce: 2 },
        [effect('release.run', { release: season.id })],
      ),
    )
  events.push(
    auto('Ban list update', { when: { kind: 'seasonWeek', week: 5 }, fromYear: 2, announce: 4 }, [
      effect('ban.update', { lift: 'keep' }),
    ]),
  )

  // Tournaments: weeks the player may pick, locked until they can enter.
  const tournamentEvent = (
    n: string,
    when: CalendarEvent['when'],
    o: Partial<CalendarEvent> = {},
  ) => {
    const t = byName(n)
    if (!t) return
    events.push({
      ...newCalendarEvent(n),
      mode: 'activity',
      when,
      important: true,
      announce: 3,
      lock: { piece: 'tournament.can', args: { tournament: t.id } },
      lockText: 'You cannot enter this one yet.',
      ...o,
      steps: enter(n),
    })
  }
  tournamentEvent('Locals', { kind: 'monthWeek', week: 2 }, { announce: 1 })
  tournamentEvent('Regionals', { kind: 'seasonWeek', week: 8 })
  tournamentEvent('Nationals', { kind: 'seasonWeek', week: 10 }, { seasons: [3] })
  tournamentEvent('Pro Tour', { kind: 'seasonWeek', week: 10 }, { seasons: [4] })
  tournamentEvent('World Championship', { kind: 'seasonWeek', week: 12 }, { seasons: [4], fromYear: 2 })

  g.calendar = { ...g.calendar, activities, events }

  // The first moments: free packs, a few tutorial hints, then the weeks begin.
  const gameStart = newEvent({ piece: 'game.start', args: {} })
  gameStart.steps.push(
    ...[
      effect('hint.show', {
        text: 'Welcome! Each week you pick one thing to do. Open your starter packs first.',
        once: 'once',
        name: 'welcome',
      }),
      effect('booster.open', { booster: booster.id }),
      effect('booster.open', { booster: booster.id }),
      effect('booster.open', { booster: booster.id }),
      effect('hint.show', {
        text: 'Build a deck of the cards you own, then enter a tournament when one comes up.',
        once: 'once',
        name: 'deck',
      }),
      effect('deck.edit', { deck: mine.id }),
    ],
  )
  g.events.push(gameStart)
  const homeStart = newEvent({ piece: 'scene.start', args: {} })
  homeStart.steps.push(effect('week.pick'))
  home.events.push(homeStart)

  g.settings = { ...g.settings, ending: { kind: 'years', years: 7, text: 'You made it to the end of the circuit!' } }
  return g
}
