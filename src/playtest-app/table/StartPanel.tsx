import { Layers, Play, TriangleAlert } from '@/ui/icons'
import { useEffect, useMemo, useState } from 'react'
import { checkDeck } from '@/adventure/deck'
import { listDecks, type DeckRow } from '@/playtest/library'
import { randomSeed } from '@/playtest/rng'
import { presets, validateSetup, type GameSetup } from '@/playtest/setup'
import { deckCards } from '@/playtest/state'
import { Button } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { useDeckCards } from '../decks/useDeckCards'
import { usePack } from './packContext'
import { usePlaytest } from './usePlaytest'

const ALL = '__all'
const SAVED = 'saved:'
const KEY = 'cardmaker.playtest'

const AS_SETUP = 'preset:adventure-scuffle'
type Mode = 'free' | 'hotseat' | 'open'

/** Last setup and decks, per device (only a convenience). */
function remembered(): { setupId?: string; decks?: string[]; mode?: Mode } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
function remember(v: { setupId: string; decks: string[]; mode: Mode }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

/** Pick a game setup and a deck for each player, then start. */
export function StartPanel({ onDecks }: { onDecks: () => void }) {
  const pack = usePack()
  const { info } = pack
  const deckCardsInfo = useDeckCards()
  const byId = useMemo(
    () => Object.fromEntries(deckCardsInfo.cards.map((c) => [c.id, c])),
    [deckCardsInfo.cards],
  )
  // Decks built in this app (the Decks screen), alongside the pack's own decks.
  const [saved, setSaved] = useState<DeckRow[]>([])
  const decks = useMemo(() => info.decks.map((d, i) => ({ id: `deck:${i}`, ...d })), [info.decks])
  const setups = useMemo<GameSetup[]>(
    () => [...presets(info.cardSize), ...(info.setups ?? [])],
    [info.cardSize, info.setups],
  )
  const [last] = useState(remembered)
  const [setupId, setSetupId] = useState(
    setups.some((s) => s.id === last.setupId) ? last.setupId! : setups[0].id,
  )
  const setup = setups.find((s) => s.id === setupId) ?? setups[0]
  const valid = (id: string | undefined) =>
    id === ALL || decks.some((d) => d.id === id) || saved.some((d) => SAVED + d.id === id)
      ? id!
      : ''
  const fallback = decks.length ? decks.map((d) => d.id) : [ALL]
  const [chosen, setChosen] = useState<string[]>(() =>
    Array.from({ length: 4 }, (_, i) => valid(last.decks?.[i]) || fallback[i % fallback.length]),
  )
  useEffect(() => {
    let live = true
    void listDecks(pack.id).then((rows) => {
      if (!live) return
      setSaved(rows)
      // Bring back a remembered pick of a saved deck now that they have loaded.
      const was = remembered().decks ?? []
      setChosen((c) =>
        c.map((v, i) =>
          was[i]?.startsWith(SAVED) && rows.some((d) => SAVED + d.id === was[i]) ? was[i] : v,
        ),
      )
    })
    return () => {
      live = false
    }
  }, [pack.id])
  // The pack lists cards in Hearthside Cardworks' order.
  const list = useMemo(() => info.cards.map((c, order) => ({ ...c, order })), [info.cards])
  const savedDeck = (choice: string) =>
    choice.startsWith(SAVED) ? saved.find((d) => SAVED + d.id === choice) : undefined
  const cardsFor = (choice: string) => {
    const own = savedDeck(choice)
    if (own) {
      const order = new Map(own.cards.map((id, i) => [id, i]))
      return deckCards(
        list.filter((c) => order.has(c.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!),
        Object.fromEntries(own.cards.map((id) => [id, 1])),
      )
    }
    return choice === ALL
      ? deckCards(list, null)
      : choice
        ? deckCards(list, decks.find((d) => d.id === choice)?.counts ?? {})
        : null
  }
  const errors = validateSetup(setup)
  const want = setup.deal?.deckSize
  // The Adventure Scuffle rules can run the game when the pack has the _AS card values.
  const canRule = setup.id === AS_SETUP && deckCardsInfo.adventure && setup.seats.length === 2
  const [mode, setMode] = useState<Mode>(last.mode ?? 'free')
  const ruled = canRule && mode !== 'free'
  const ids = (i: number) => cardsFor(chosen[i])?.map((c) => c.cardId) ?? []
  const deckProblem = (i: number) => {
    const c = checkDeck(ids(i), byId)
    return c.ok ? null : c.problems[0]
  }
  const blocked = ruled && setup.seats.some((_, i) => deckProblem(i))

  const start = () => {
    const picks = setup.seats.map((_, i) => chosen[i])
    remember({ setupId: setup.id, decks: chosen, mode })
    const pt = usePlaytest.getState()
    if (ruled)
      pt.startRules(
        pack.id,
        setup,
        {
          cards: deckCardsInfo.cards,
          decks: [ids(0), ids(1)],
          names: [setup.seats[0].name, setup.seats[1].name],
          seed: randomSeed(),
        },
        mode === 'hotseat',
      )
    else pt.start(pack.id, setup, picks.map(cardsFor))
  }

  return (
    <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto bg-canvas p-4">
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-xl border bg-panel p-5 shadow-xl"
        data-testid="playtest-start"
      >
        <div>
          <h2 className="text-base font-semibold">New game</h2>
          <p className="text-sm text-muted-foreground">
            Lay out a table for your game and play it by hand: move, flip and turn cards, keep
            score. For Adventure Scuffle, the app can also run the rules for you.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pt-setup">Game</Label>
          <NativeSelect id="pt-setup" value={setup.id} onChange={(e) => setSetupId(e.target.value)}>
            {setups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {setup.zones.length} zones · {setup.seats.length} players
            {setup.phases.length ? ` · ${setup.phases.join(' → ')}` : ''}
          </p>
        </div>
        {canRule && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-mode">Rules</Label>
            <NativeSelect
              id="pt-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              data-testid="playtest-mode"
            >
              <option value="free">Free table (you apply the rules)</option>
              <option value="hotseat">Rules on: two players, one device</option>
              <option value="open">Rules on: see both sides (playtest alone)</option>
            </NativeSelect>
            <p className="text-xs text-muted-foreground">
              {mode === 'free'
                ? 'Move, flip and turn cards yourself; nothing is checked.'
                : mode === 'hotseat'
                  ? "The app runs the Mutual Reveal rules and hides each player's cards until the device is handed over. Card abilities are not active yet: cards play with their stats."
                  : 'The app runs the Mutual Reveal rules and you play both players, seeing everything. Card abilities are not active yet: cards play with their stats.'}
            </p>
          </div>
        )}
        {setup.deal &&
          setup.seats.map((seat, i) => {
            const picked = cardsFor(chosen[i])
            const n = picked?.length ?? 0
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <Label htmlFor={`pt-deck-${i}`} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: seat.color }} />
                  {seat.name}'s deck
                </Label>
                <NativeSelect
                  id={`pt-deck-${i}`}
                  value={chosen[i]}
                  onChange={(e) =>
                    setChosen((c) => c.map((v, j) => (j === i ? e.target.value : v)))
                  }
                >
                  {saved.length > 0 && (
                    <optgroup label="Your decks">
                      {saved.map((d) => (
                        <option key={d.id} value={SAVED + d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {decks.length > 0 && (
                    <optgroup label="Decks in the pack">
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value={ALL}>All cards (one of each)</option>
                  <option value="">No cards</option>
                </NativeSelect>
                {(() => {
                  const own = savedDeck(chosen[i])
                  const problems = ruled
                    ? [deckProblem(i)].filter(Boolean)
                    : own
                      ? checkDeck(own.cards, byId).problems
                      : []
                  return problems.length > 0 ? (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="size-3.5 shrink-0" />
                      {problems[0]}
                    </p>
                  ) : null
                })()}
                {!ruled && !savedDeck(chosen[i]) && want !== undefined && picked && n !== want && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    {n} card{n === 1 ? '' : 's'}; this game uses {want}.
                  </p>
                )}
              </div>
            )
          })}
        <Button variant="secondary" onClick={onDecks} data-testid="playtest-decks-button">
          <Layers /> Build decks…
        </Button>
        {decks.length === 0 && saved.length === 0 && setup.deal && (
          <p className="text-xs text-muted-foreground">
            Tip: build a deck for each player with Build decks…, or in Hearthside Cardworks' Decks
            panel before exporting the game pack.
          </p>
        )}
        {errors.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        {blocked && (
          <p className="text-xs text-danger">
            With the rules on, each player needs a legal Free Company: 12 different cards, at most
            one Ace.
          </p>
        )}
        <Button
          onClick={start}
          disabled={errors.length > 0 || blocked}
          data-testid="playtest-start-button"
        >
          <Play /> Start
        </Button>
      </div>
    </div>
  )
}
