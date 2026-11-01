import type { GameView } from '../../store/gameStore'

const WORLD_VIEWS = ['portrait', 'character', 'shop', 'booster', 'activity', 'calEvent', 'calendar', 'text', 'league', 'tournament', 'release', 'bans', 'market', 'simulator']

export const isWorldView = (v: GameView) => WORLD_VIEWS.includes(v.kind)

/** The right panel's words for these views. */
export function worldHelp(kind: GameView['kind']): string | null {
  switch (kind) {
    case 'portrait':
      return 'Draw each layer’s options on the same canvas size. Grey layers use the ramp: mid grey becomes the chosen colour, keeping the shading. Expressions swap an option’s picture where it has one.'
    case 'character':
      return '“A character says something” in Cause and Effect shows them in the dialogue box, with an expression.'
    case 'shop':
      return '“Open a shop” in Cause and Effect shows this shop while the game runs. Boosters bought here open straight away.'
    case 'booster':
      return 'Each card in a pack rolls its own rarity. Ace cards come from the Ace field set in Items. “Open a booster” gives one for free.'
    case 'activity':
    case 'calEvent':
      return '“Pick this week’s activity” lists the activities and this week’s events, runs the picked one, then starts the next week (the weekly tick and automatic events run then).'
    case 'calendar':
      return 'The player’s Calendar shows what they know is coming: each event is announced as set.'
    case 'league':
      return 'Levels group duelists by rating. Tracks are point ladders that tournaments pay into. Names are what generated duelists are called.'
    case 'tournament':
      return '“Enter a tournament” in Cause and Effect plays this one. Stages run in order; the best of each stage go on to the next.'
    case 'release':
      return 'A release adds cards to the pool of cards in circulation. Fixed cards always come; the rest are drawn at random.'
    case 'bans':
      return 'Bans are announced ahead and come into force some weeks later. The hand-picked list is always included.'
    case 'market':
      return 'The market only runs while the league is on. Prices change at the end of each week.'
    case 'simulator':
      return 'Each player runs the whole calendar with the league’s tournaments, releases, bans and market. Change a number, run again, and compare. Nothing here touches a saved game.'
    case 'text':
      return 'These lines are shown in the game’s menus and screens. Change them for another voice or language.'
    default:
      return null
  }
}
