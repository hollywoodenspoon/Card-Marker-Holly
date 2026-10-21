import { Play, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { presets, validateSetup, type GameSetup } from '@/playtest/setup'
import { deckCards } from '@/playtest/state'
import { Button } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { usePack } from './packContext'
import { usePlaytest } from './usePlaytest'

const ALL = '__all'
const KEY = 'cardmaker.playtest'

/** Last setup and decks, per device (only a convenience). */
function remembered(): { setupId?: string; decks?: string[] } {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
function remember(v: { setupId: string; decks: string[] }) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

/** Pick a game setup and a deck for each player, then start. */
export function StartPanel() {
  const pack = usePack()
  const { info } = pack
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
    id === ALL || decks.some((d) => d.id === id) ? id! : ''
  const fallback = decks.length ? decks.map((d) => d.id) : [ALL]
  const [chosen, setChosen] = useState<string[]>(() =>
    Array.from({ length: 4 }, (_, i) => valid(last.decks?.[i]) || fallback[i % fallback.length]),
  )
  // The pack lists cards in Card Maker's order.
  const list = useMemo(() => info.cards.map((c, order) => ({ ...c, order })), [info.cards])
  const cardsFor = (choice: string) =>
    choice === ALL
      ? deckCards(list, null)
      : choice
        ? deckCards(list, decks.find((d) => d.id === choice)?.counts ?? {})
        : null
  const errors = validateSetup(setup)
  const want = setup.deal?.deckSize

  const start = () => {
    const picks = setup.seats.map((_, i) => chosen[i])
    remember({ setupId: setup.id, decks: chosen })
    usePlaytest.getState().start(pack.id, setup, picks.map(cardsFor))
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
            score. Nothing is checked yet, so you play by your own rules.
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
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                  <option value={ALL}>All cards (one of each)</option>
                  <option value="">No cards</option>
                </NativeSelect>
                {want !== undefined && picked && n !== want && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <TriangleAlert className="size-3.5 shrink-0" />
                    {n} card{n === 1 ? '' : 's'}; this game uses {want}.
                  </p>
                )}
              </div>
            )
          })}
        {decks.length === 0 && setup.deal && (
          <p className="text-xs text-muted-foreground">
            Tip: make a deck for each player in Card Maker's Decks panel, then export the game pack
            again, to choose exactly which cards they play with.
          </p>
        )}
        {errors.length > 0 && (
          <ul className="list-disc pl-5 text-xs text-danger">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
        <Button onClick={start} disabled={errors.length > 0} data-testid="playtest-start-button">
          <Play /> Start
        </Button>
      </div>
    </div>
  )
}
