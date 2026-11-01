/**
 * The game text list: every line of wording the player screens use. Each line has
 * a default; a game overrides any of them (translations, a different voice).
 * Values may use {name} placeholders, filled by the caller.
 */
export interface TextDef {
  key: string
  group: string
  label: string
  default: string
}

export const TEXT_DEFS: TextDef[] = [
  { key: 'menu.bag', group: 'Menus', label: 'Bag', default: 'Bag' },
  { key: 'menu.log', group: 'Menus', label: 'Log', default: 'Log' },
  { key: 'menu.saves', group: 'Menus', label: 'Save and load', default: 'Save and load' },
  { key: 'menu.calendar', group: 'Menus', label: 'Calendar', default: 'Calendar' },
  { key: 'save.auto', group: 'Menus', label: 'Autosave slot', default: 'Autosave {n}' },
  { key: 'save.slot', group: 'Menus', label: 'Save slot', default: 'Slot {n}' },
  { key: 'dialogue.continue', group: 'Dialogue', label: 'Continue', default: 'Continue ▸' },
  { key: 'world.step', group: 'Weeks', label: 'The world moves on', default: 'The week ends…' },
  { key: 'week.this', group: 'Weeks', label: 'This week', default: 'This week' },
  { key: 'week.locked', group: 'Weeks', label: 'Locked activity', default: 'Not possible this week.' },
  { key: 'shop.leave', group: 'Shops', label: 'Leave the shop', default: 'Leave the shop' },
  { key: 'shop.close', group: 'Shops', label: 'Leave button', default: 'Leave' },
  { key: 'shop.money', group: 'Shops', label: 'Money line', default: 'Money: {money}' },
  { key: 'shop.noMoney', group: 'Shops', label: 'No money set', default: 'This game has no money set.' },
  { key: 'shop.short', group: 'Shops', label: 'Not enough money', default: 'Not enough money.' },
  { key: 'shop.soldOut', group: 'Shops', label: 'Sold out', default: 'Sold out' },
  { key: 'booster.tap', group: 'Boosters', label: 'Hint', default: 'Tap a card to turn it over.' },
  { key: 'booster.done', group: 'Boosters', label: 'All shown', default: 'All cards are in your collection.' },
  { key: 'booster.showAll', group: 'Boosters', label: 'Show all', default: 'Show all' },
  { key: 'booster.next', group: 'Boosters', label: 'Next card', default: 'Next card' },
  { key: 'booster.close', group: 'Boosters', label: 'Done', default: 'Done' },
  { key: 'deck.search', group: 'Deck', label: 'Search', default: 'Search your cards' },
  { key: 'game.noScenes', group: 'Game', label: 'No scenes', default: 'This game has no scenes yet.' },
  { key: 'game.away', group: 'Game', label: 'Card game open', default: 'The card game is open on the table. Come back when it’s over.' },
  { key: 'game.end', group: 'Game', label: 'Ending title', default: 'The end' },
  { key: 'game.load', group: 'Game', label: 'Load a save', default: 'Load a save' },
  { key: 'tourney.enter', group: 'Tournaments', label: 'Enter', default: 'Enter' },
  { key: 'tourney.notInvited', group: 'Tournaments', label: 'No invite', default: 'You are not invited to this one.' },
  { key: 'tourney.notEnough', group: 'Tournaments', label: 'Not enough points', default: 'You need {n} points to enter.' },
  { key: 'tourney.illegal', group: 'Tournaments', label: 'Banned cards in deck', default: 'Your deck has banned cards: {cards}.' },
  { key: 'tourney.noDeck', group: 'Tournaments', label: 'Empty deck', default: 'That deck has no cards in it.' },
  { key: 'tourney.back', group: 'Tournaments', label: 'Keep playing', default: 'Keep playing' },
  { key: 'tourney.you', group: 'Tournaments', label: 'You (in the bracket)', default: 'You' },
  { key: 'tourney.play', group: 'Tournaments', label: 'Play the match', default: 'Play the match' },
  { key: 'tourney.next', group: 'Tournaments', label: 'Next round', default: 'Next round' },
  { key: 'tourney.skip', group: 'Tournaments', label: 'Skip to the results', default: 'Skip to the results' },
  { key: 'tourney.close', group: 'Tournaments', label: 'Finish', default: 'Finish' },
  { key: 'tourney.sure', group: 'Tournaments', label: 'Forfeit: are you sure', default: 'Forfeit? It counts as a loss.' },
  { key: 'tourney.yourMatch', group: 'Tournaments', label: 'Your match', default: 'Your match: {name} (best of {games})' },
  { key: 'tourney.thisRound', group: 'Tournaments', label: 'This round', default: 'This round' },
  { key: 'tourney.standings', group: 'Tournaments', label: 'Standings', default: 'Standings' },
  { key: 'tourney.results', group: 'Tournaments', label: 'Final results', default: 'Final results' },
  { key: 'tourney.forfeit', group: 'Tournaments', label: 'Forfeit', default: 'Forfeit the match' },
  { key: 'tourney.spectate', group: 'Tournaments', label: 'Spectate', default: 'You are out. Watch the rest.' },
  { key: 'tourney.won', group: 'Tournaments', label: 'You won', default: 'You won {name}!' },
  { key: 'tourney.placed', group: 'Tournaments', label: 'You placed', default: 'You placed {place} in {name}.' },
  { key: 'tourney.prize', group: 'Tournaments', label: 'Prize', default: 'Prize: {money}' },
  { key: 'release.new', group: 'Cards', label: 'New cards', default: '{count} new cards are out: {name}.' },
  { key: 'ban.announce', group: 'Cards', label: 'Ban announced', default: 'Ban list update in {weeks} weeks.' },
  { key: 'ban.now', group: 'Cards', label: 'Ban in force', default: 'The ban list changed: {cards}.' },
  { key: 'hint.ok', group: 'Hints', label: 'Hint button', default: 'Got it' },
  { key: 'hint.title', group: 'Hints', label: 'Hint title', default: 'Hint' },
  { key: 'duel.noDeck', group: 'Duels', label: 'No deck to play', default: 'You need a deck to play a card game.' },
  { key: 'duel.noOpponent', group: 'Duels', label: 'Opponent has no deck', default: 'They have no deck to play with.' },
  { key: 'duel.you', group: 'Duels', label: 'Your seat name', default: 'You' },
  { key: 'duel.myDeck', group: 'Duels', label: 'Your own deck name', default: 'My deck' },
  { key: 'duel.pause', group: 'Duels', label: 'Pause', default: 'Pause and save' },
]

/** The game's overrides: key → text. */
export type GameText = Record<string, string>

export function textFor(text: GameText | undefined, key: string): string {
  const own = text?.[key]
  if (typeof own === 'string' && own !== '') return own
  return TEXT_DEFS.find((d) => d.key === key)?.default ?? key
}

/** The line with {placeholders} filled. */
export function fillLine(line: string, vars: Record<string, string | number> = {}): string {
  return line.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m))
}

export const tidyText = (raw: unknown): GameText =>
  raw && typeof raw === 'object'
    ? Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as GameText
    : {}
