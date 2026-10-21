import { Check, Maximize2, Shuffle, Swords } from '@/ui/icons'
import { abilityText } from '@/adventure/cards'
import { actor, isLegal, legalMoves, prompt } from '@/adventure/engine'
import { other } from '@/adventure/state'
import { engagementTotals, fightingSpirit } from '@/adventure/stats'
import { seenBy } from '@/playtest/actions'
import { Button } from '@/ui/components/ui/button'
import { usePlaytest } from './usePlaytest'

/**
 * With the rules on: what to do now, in words, and the buttons for choices
 * that aren't a tap on the table (pass, the First Engagement, Fighting Spirit).
 */
export function RulesBar({ onZoom }: { onZoom: (pieceId: string) => void }) {
  const setup = usePlaytest((s) => s.setup)!
  const state = usePlaytest((s) => s.state)!
  const rules = usePlaytest((s) => s.rules)!
  const picks = usePlaytest((s) => s.picks)
  const selected = usePlaytest((s) => s.selected)
  const viewer = usePlaytest((s) => s.viewer)
  const play = usePlaytest((s) => s.play)
  const st = rules.step
  const who = actor(rules)
  const color = who === null ? undefined : setup.seats[who]?.color
  const zoomable =
    selected?.kind === 'piece' && seenBy(setup, state, selected.id, viewer) !== 'back'
      ? selected.id
      : null

  let hint = ''
  let buttons: React.ReactNode = null
  if (st.k === 'place') {
    hint = 'Tap a card, then an empty position (or drag it).'
    buttons = (
      <>
        {isLegal(rules, { t: 'placeRandom' }) && (
          <Button size="sm" variant="secondary" onClick={() => play({ t: 'placeRandom' })}>
            <Shuffle /> Fill randomly
          </Button>
        )}
        {isLegal(rules, { t: 'done' }) && (
          <Button size="sm" onClick={() => play({ t: 'done' })} data-testid="rules-done">
            <Check /> Done
          </Button>
        )}
      </>
    )
  } else if (st.k === 'reveal') {
    hint = picks.length ? 'Now tap a card next to it.' : 'Tap a highlighted card.'
  } else if (st.k === 'respond') {
    buttons = (
      <Button size="sm" variant="secondary" onClick={() => play({ t: 'pass' })}>
        Pass
      </Button>
    )
  } else if (st.k === 'first') {
    buttons = legalMoves(rules).map((m) =>
      m.t === 'first' ? (
        <Button
          key={m.attacker}
          size="sm"
          variant="secondary"
          onClick={() => play(m)}
          data-testid={`rules-first-${m.attacker}`}
        >
          <Swords /> {rules.players[m.attacker].name}'s attack first
        </Button>
      ) : null,
    )
  } else if (st.k === 'fs' && rules.engagement) {
    const e = rules.engagement
    const t = engagementTotals(rules, e)
    const side = e.attacker === st.seat ? 'Attack' : 'Defense'
    // Only the player to act may see what's in their Support.
    const mine = viewer === null || viewer === st.seat
    buttons = (
      <>
        <span
          className="shrink-0 rounded-md bg-muted px-2 py-1 text-sm font-semibold tabular-nums"
          data-testid="rules-totals"
        >
          {rules.players[e.attacker].name} {t.attack} : {t.defense}{' '}
          {rules.players[other(e.attacker)].name}
        </span>
        {mine &&
          rules.players[st.seat].support.map((card) => (
            <Button
              key={card}
              size="sm"
              variant="secondary"
              title={abilityText(rules.cards[card]?.ability ?? '')}
              onClick={() => play({ t: 'fs', card })}
              data-testid="rules-fs"
            >
              {rules.cards[card]?.name ?? 'Card'}{' '}
              <span className="font-semibold tabular-nums">
                +{fightingSpirit(rules, st.seat, card)}
              </span>
            </Button>
          ))}
        <Button size="sm" onClick={() => play({ t: 'pass' })} data-testid="rules-pass">
          Pass ({side.toLowerCase()} {side === 'Attack' ? t.attack : t.defense})
        </Button>
      </>
    )
  }

  return (
    <div
      className="flex shrink-0 flex-col gap-1.5 border-t bg-panel px-2 py-1.5 pb-safe"
      role="region"
      aria-label="Rules"
      data-testid="rules-bar"
    >
      <p className="flex items-start gap-2 text-sm" aria-live="polite">
        {color && (
          <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        )}
        <span>
          <span className="font-medium" data-testid="rules-prompt">
            {prompt(rules)}
          </span>
          {hint && <span className="text-muted-foreground"> {hint}</span>}
        </span>
      </p>
      {(buttons || zoomable) && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {buttons}
          <span className="flex-1" />
          {zoomable && (
            <Button size="sm" variant="ghost" onClick={() => onZoom(zoomable)}>
              <Maximize2 /> Zoom
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
