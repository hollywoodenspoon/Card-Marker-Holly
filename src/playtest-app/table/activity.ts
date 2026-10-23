import type { AsState, Seat } from '@/adventure/state'

/**
 * What each player is doing, in a few words: the step the player to act is on,
 * and each player's recent actions, shortened from the game log. Pure, so the
 * tracker, the table and replays read the same words.
 */

/** What the player to act is doing now. */
export function stepVerb(s: AsState): string | null {
  const st = s.step
  switch (st.k) {
    case 'rps':
      return 'Throwing'
    case 'initiative':
      return 'Deciding the initiative'
    case 'place':
      return st.from === 'rest' ? 'Refilling the field' : 'Placing cards'
    case 'reveal':
      return st.count === 1 ? 'Revealing a card' : `Revealing ${st.count} cards`
    case 'respond':
      return 'Responding'
    case 'choose':
      return 'Choosing'
    case 'first':
      return 'Picking the First Engagement'
    case 'fs':
      return 'Fighting Spirit'
    default:
      return null
  }
}

/** Shortenings for a player's own log lines (after their name). */
const SHORT: [RegExp, (m: RegExpExecArray) => string][] = [
  [
    /^reveals (.+?) from the rest zone as Fighting Spirit \(\+(\d+)\)/,
    (m) => `FS: ${m[1]} +${m[2]} (rest zone)`,
  ],
  [/^reveals (.+?) as Fighting Spirit \(\+(\d+)\)/, (m) => `FS: ${m[1]} +${m[2]}`],
  [/^reveals (.+?) from their Support:/, (m) => `Used ${m[1]}`],
  [/^reveals (.+?) on .+'s field\./, (m) => `Revealed ${names(m[1])}`],
  [/^uses (.+?)'s Field Ability/, (m) => `Used ${m[1]}`],
  [/^(?:has no Support left and )?passes\./, () => 'Passed'],
  [/^chooses (.+?)'s attack as the First Engagement/, (m) => `First: ${m[1]}'s attack`],
  [/^chooses (.+?) \(/, (m) => `Chose ${m[1]}`],
  [/^rests (.+?) (?:from their Support|to pay the cost)/, (m) => `Rested ${m[1]}`],
  [/^placed (\d+) cards? face down/, (m) => `Placed ${m[1]} card${m[1] === '1' ? '' : 's'}`],
  [
    /^(takes|gives) the initiative/,
    (m) => (m[1] === 'takes' ? 'Took' : 'Gave') + ' the initiative',
  ],
  [/^flips a coin for (.+?): (Heads|Tails)/, (m) => `Coin for ${m[1]}: ${m[2]}`],
]

/** "A (Front Line…, Fate 1) and B (…)" as "A, B". */
const names = (list: string) =>
  list
    .split(/\) and /)
    .map((x) => x.replace(/ \(.*$/, ''))
    .join(', ')

/** A player's most recent actions, newest first, at most `n`. */
export function recentActions(s: AsState, seat: Seat, n = 4): string[] {
  const name = s.players[seat].name
  const other = s.players[seat === 0 ? 1 : 0].name
  const out: string[] = []
  for (let i = s.log.length - 1; i >= 0 && out.length < n; i--) {
    const text = s.log[i].text
    // Rock-paper-scissors names both players' throws in one line.
    const rps = /^(.+?) throws (\w+), (.+?) throws (\w+)/.exec(text)
    if (rps) {
      if (rps[1] === name) out.push(`Threw ${rps[2]}`)
      else if (rps[3] === name) out.push(`Threw ${rps[4]}`)
      continue
    }
    // The longer name first, so "Player 2" never claims "Player 2 (Hard bot)"'s line.
    if (!text.startsWith(name + ' ') || (other.startsWith(name) && text.startsWith(other + ' ')))
      continue
    const rest = text.slice(name.length + 1)
    const short = SHORT.map(([re, f]) => {
      const m = re.exec(rest)
      return m ? f(m) : null
    }).find(Boolean)
    out.push(short ?? cut(rest))
  }
  return out
}

/** A line's first clause, capitalised and kept short. */
function cut(text: string) {
  const first = text.split(/[:.]/)[0].trim()
  const t = first.length > 44 ? first.slice(0, 43) + '…' : first
  return t.charAt(0).toUpperCase() + t.slice(1)
}
