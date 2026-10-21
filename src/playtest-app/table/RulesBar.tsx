import { Check, Maximize2, Pause, Play, Shuffle, StepForward, Swords } from '@/ui/icons'
import { abilityText } from '@/adventure/cards'
import {
  abilityName,
  actor,
  fsPreview,
  isLegal,
  legalMoves,
  prompt,
  responseMoves,
} from '@/adventure/engine'
import { other } from '@/adventure/state'
import { engagementTotals } from '@/adventure/stats'
import { seenBy } from '@/playtest/actions'
import { Button, IconButton } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { usePlaytest, type BotSpeed } from './usePlaytest'

/**
 * With the rules on: what to do now, in words, and the buttons for choices
 * that aren't a tap on the table (abilities, choices, the First Engagement,
 * Fighting Spirit, pass).
 */
export function RulesBar({
  onZoom,
  botToAct,
  onBotStep,
}: {
  onZoom: (pieceId: string) => void
  /** A bot is to act: its controls replace the choices. */
  botToAct: boolean
  onBotStep: () => void
}) {
  const bots = usePlaytest((s) => s.bots)
  const botSpeed = usePlaytest((s) => s.botSpeed)
  const botPaused = usePlaytest((s) => s.botPaused)
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
    const mine = viewer === null || viewer === st.seat
    buttons = (
      <>
        {mine &&
          responseMoves(rules, st.seat).map((m) =>
            m.t === 'ability' ? (
              <Button
                key={m.card}
                size="sm"
                variant="secondary"
                title={abilityText(rules.cards[m.card]?.ability ?? '')}
                onClick={() => play(m)}
                data-testid="rules-ability"
              >
                <span>
                  <span className="font-semibold">{rules.cards[m.card]?.name}:</span>{' '}
                  {abilityName(rules, st.seat, m.card)}
                </span>
              </Button>
            ) : null,
          )}
        <Button size="sm" onClick={() => play({ t: 'pass' })} data-testid="rules-pass">
          Pass
        </Button>
      </>
    )
  } else if (st.k === 'choose') {
    hint = st.options.some((o) => o.card || o.slot !== undefined)
      ? 'Tap a highlighted card, or pick below.'
      : ''
    // Only the chooser sees the choices (they may name hidden cards).
    const mine = viewer === null || viewer === st.seat
    buttons = mine
      ? st.options.map((o) => (
          <Button
            key={o.id}
            size="sm"
            variant={o.id === 'decline' ? 'ghost' : 'secondary'}
            onClick={() => play({ t: 'choose', id: o.id })}
            data-testid="rules-choice"
          >
            {o.label}
          </Button>
        ))
      : null
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
          legalMoves(rules).map((m) => {
            if (m.t !== 'fs') return null
            const v = fsPreview(rules, st.seat, m.card, m.from)
            return (
              <Button
                key={`${m.from ?? 'support'}:${m.card}`}
                size="sm"
                variant="secondary"
                title={abilityText(rules.cards[m.card]?.ability ?? '')}
                onClick={() => play(m)}
                data-testid="rules-fs"
              >
                {rules.cards[m.card]?.name ?? 'Card'}
                {m.from === 'rest' && (
                  <span className="text-muted-foreground">(rest zone)</span>
                )}{' '}
                <span className="font-semibold tabular-nums">{v === null ? 'coin' : `+${v}`}</span>
              </Button>
            )
          })}
        <Button size="sm" onClick={() => play({ t: 'pass' })} data-testid="rules-pass">
          Pass ({side.toLowerCase()} {side === 'Attack' ? t.attack : t.defense})
        </Button>
      </>
    )
  }

  if (botToAct && st.k !== 'over') {
    hint = botPaused ? 'Paused.' : 'The bot is thinking…'
    buttons = null
  }
  const botControls = bots.some(Boolean) && st.k !== 'over' && (
    <>
      <NativeSelect
        aria-label="Bot speed"
        className="w-auto"
        value={botSpeed}
        onChange={(e) => usePlaytest.getState().setBotSpeed(e.target.value as BotSpeed)}
        data-testid="bot-speed"
      >
        <option value="slow">Slow</option>
        <option value="normal">Normal speed</option>
        <option value="fast">Fast</option>
      </NativeSelect>
      <IconButton
        label={botPaused ? 'Let the bot play' : 'Pause the bot'}
        onClick={() => usePlaytest.getState().setBotPaused(!botPaused)}
        data-testid="bot-pause"
      >
        {botPaused ? <Play /> : <Pause />}
      </IconButton>
      {botPaused && botToAct && (
        <Button size="sm" variant="secondary" onClick={onBotStep} data-testid="bot-step">
          <StepForward /> Next move
        </Button>
      )}
    </>
  )

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
      {(buttons || zoomable || botControls) && (
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {buttons}
          <span className="flex-1" />
          {botControls}
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
