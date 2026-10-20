import { placeName, seenBy } from '@/playtest/actions'
import { parseZoneKey } from '@/playtest/setup'
import { piecesIn } from '@/playtest/state'
import { Button } from '@/ui/components/ui/button'
import { Sheet } from '@/ui/components/ui/sheet'
import { PieceFace } from './Piece'
import { useFaces } from './useCardFaces'
import { usePlaytest } from './usePlaytest'

/** Every card in a zone, big enough to read (a pile, a hand, the field). Tap one to select it. */
export function ZoneSheet({
  zone,
  onClose,
  phone,
}: {
  zone: string | null
  onClose: () => void
  phone: boolean
}) {
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const viewer = usePlaytest((s) => s.viewer)
  const act = usePlaytest((s) => s.act)
  const select = usePlaytest((s) => s.select)
  const faces = useFaces()
  const open = !!zone && !!setup && !!state
  const ids = open ? piecesIn(state!, zone!).slice().reverse() : []
  const kind = open
    ? setup!.zones.find((z) => z.id === parseZoneKey(zone!).zoneId)?.kind
    : undefined
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      side={phone ? 'bottom' : 'right'}
      title={open ? placeName(setup!, zone!) : 'Zone'}
      tall
    >
      {open && (
        <div className="flex flex-col gap-3 p-3">
          <div className="flex flex-wrap gap-2">
            {kind !== 'grid' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => act({ t: 'shuffle', zone: zone! })}
              >
                Shuffle
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => act({ t: 'pick', zone: zone! })}>
              Pick a random card
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              {ids.length} card{ids.length === 1 ? '' : 's'}
              {kind === 'stack' ? ', top first' : ''}
            </span>
          </div>
          {ids.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
          <ul
            className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2"
            aria-label="Cards"
          >
            {ids.map((id) => {
              const p = state!.pieces[id]
              const f = faces[p.cardId]
              const seen = seenBy(setup!, state!, id, viewer)
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col items-center gap-1 rounded-lg p-1 hover:bg-muted ${state!.last.picked === id ? 'ring-2 ring-amber-400' : ''}`}
                    onClick={() => {
                      select({ kind: 'piece', id })
                      onClose()
                    }}
                  >
                    <span
                      className="block w-full"
                      style={{ aspectRatio: f ? `${f.w} / ${f.h}` : '63 / 88' }}
                    >
                      <PieceFace
                        piece={p}
                        face={f}
                        seen={seen}
                        color={setup!.seats[p.owner]?.color ?? '#64748b'}
                      />
                    </span>
                    <span className="w-full truncate text-xs">
                      {seen === 'back' ? 'Face-down card' : p.name}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Sheet>
  )
}
