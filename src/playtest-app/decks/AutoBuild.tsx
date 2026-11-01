import { Sparkles, Square } from '@/ui/icons'
import { useRef, useState } from 'react'
import type { AsCard } from '@/adventure/cards'
import { DECK_LEVEL_NAMES, DECK_LEVELS, type DeckLevel } from '@/adventure/deckgen/build'
import { toast } from '@/ui/components/feedback'
import { Button } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { autoBuildDeck } from './autoBuildDeck'

/**
 * "Auto-build": a new Free Company from the whole pack at one of three levels.
 * The first time (and after the cards change) the pack's card values are
 * worked out from bot games; Very optimal also tunes its deck with games.
 */
export function AutoBuild({
  packId,
  cards,
  packDecks,
  onBuilt,
}: {
  packId: string
  cards: AsCard[]
  /** Legal pack decks: the gauntlet Very optimal is tuned against. */
  packDecks: string[][]
  onBuilt: (name: string, ids: string[]) => void
}) {
  const [level, setLevel] = useState<DeckLevel>('optimal')
  const [busy, setBusy] = useState<string | null>(null)
  const [part, setPart] = useState(0)
  const stop = useRef(false)

  const run = async () => {
    stop.current = false
    try {
      const built = await autoBuildDeck(
        packId,
        cards,
        packDecks,
        level,
        (text, p) => {
          setBusy(text)
          setPart(p)
        },
        () => stop.current,
      )
      if (!built) return
      onBuilt(`${DECK_LEVEL_NAMES[level]} deck`, built.ids)
      toast(built.notes.join(' '))
    } catch (e) {
      toast(`Auto-build stopped: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid="auto-build">
      <div className="flex items-center gap-2">
        <NativeSelect
          aria-label="Auto-build level"
          className="min-w-0 flex-1"
          value={level}
          onChange={(e) => setLevel(e.target.value as DeckLevel)}
          disabled={!!busy}
          data-testid="auto-build-level"
        >
          {DECK_LEVELS.map((l) => (
            <option key={l} value={l}>
              {DECK_LEVEL_NAMES[l]}
            </option>
          ))}
        </NativeSelect>
        {busy ? (
          <Button size="sm" variant="secondary" onClick={() => (stop.current = true)}>
            <Square /> Stop
          </Button>
        ) : (
          <Button size="sm" onClick={() => void run()} data-testid="auto-build-go">
            <Sparkles /> Auto-build
          </Button>
        )}
      </div>
      {busy && (
        <div role="status" className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>{busy}</span>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${Math.round(part * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
