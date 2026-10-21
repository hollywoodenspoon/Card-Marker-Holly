import { FlipHorizontal2, Maximize2, Move, Undo2, X } from 'lucide-react'
import { placeName, seenBy } from '@/playtest/actions'
import { parseZoneKey, zoneKey } from '@/playtest/setup'
import { locate } from '@/playtest/state'
import { Button, IconButton } from '@/ui/components/ui/button'
import { usePlaytest } from './usePlaytest'

/** What you can do with the selected piece or token. */
export function ActionBar({ onZoom }: { onZoom: (pieceId: string) => void }) {
  const setup = usePlaytest((s) => s.setup)!
  const state = usePlaytest((s) => s.state)!
  const selected = usePlaytest((s) => s.selected)
  const placing = usePlaytest((s) => s.placing)
  const viewer = usePlaytest((s) => s.viewer)
  const act = usePlaytest((s) => s.act)
  const select = usePlaytest((s) => s.select)
  if (!selected) return null
  const bar =
    'flex shrink-0 items-center gap-1.5 overflow-x-auto border-t bg-panel px-2 py-1.5 pb-safe'

  if (selected.kind === 'token') {
    const t = state.tokens[selected.id]
    const def = t && setup.tokens.find((d) => d.id === t.tokenId)
    if (!t || !def) return null
    const owner = t.owner === null ? '' : `${setup.seats[t.owner]?.name}'s `
    return (
      <div className={bar} role="toolbar" aria-label="Token actions" data-testid="playtest-actions">
        <span className="mr-1 shrink-0 text-sm font-medium">
          {owner}
          {def.name}
        </span>
        {placing ? (
          <span className="shrink-0 text-sm text-muted-foreground">
            Tap a card, slot or spot for it…
          </span>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => select(selected, true)}>
            <Move /> Place…
          </Button>
        )}
        {!('pool' in t.at) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => act({ t: 'token', token: t.id, to: { pool: true } })}
          >
            <Undo2 /> Back to tray
          </Button>
        )}
        <span className="flex-1" />
        <IconButton label="Done" onClick={() => select(null)}>
          <X />
        </IconButton>
      </div>
    )
  }

  const p = state.pieces[selected.id]
  const at = p && locate(state, p.id)
  if (!p || !at) return null
  const seen = seenBy(setup, state, p.id, viewer)
  const here = parseZoneKey(at.key)
  const zone = setup.zones.find((z) => z.id === here.zoneId)
  // Quick moves: the owner's other zones and the shared ones.
  const quick = setup.zones
    .map((z) => zoneKey(z.id, z.perSeat ? p.owner : null))
    .filter(
      (k) =>
        k !== at.key && setup.zones.find((z) => z.id === parseZoneKey(k).zoneId)?.kind !== 'grid',
    )
  const turnable = zone?.kind === 'grid' || zone?.kind === 'area'
  return (
    <div className={bar} role="toolbar" aria-label="Card actions" data-testid="playtest-actions">
      <span
        className="mr-1 max-w-40 shrink-0 truncate text-sm font-medium"
        title={placeName(setup, at.key, at.slot)}
      >
        {seen === 'back' ? 'Face-down card' : p.name}
      </span>
      {placing ? (
        <span className="shrink-0 text-sm text-muted-foreground">Tap where it goes…</span>
      ) : (
        <>
          <Button size="sm" variant="secondary" onClick={() => act({ t: 'flip', piece: p.id })}>
            <FlipHorizontal2 /> {p.faceUp ? 'Turn face down' : 'Reveal'}
          </Button>
          {turnable &&
            setup.cardStates.map((cs) => (
              <Button
                key={cs.id}
                size="sm"
                variant="secondary"
                active={p.state === cs.id}
                aria-pressed={p.state === cs.id}
                onClick={() => act({ t: 'state', piece: p.id, state: cs.id })}
              >
                <span
                  className="inline-block size-3 rounded-[2px] border border-current"
                  style={{ transform: `rotate(${cs.rotation}deg)` }}
                />
                {cs.name}
              </Button>
            ))}
          <Button size="sm" variant="secondary" onClick={() => select(selected, true)}>
            <Move /> Move…
          </Button>
          {quick.map((k) => (
            <Button
              key={k}
              size="sm"
              variant="ghost"
              onClick={() => act({ t: 'move', piece: p.id, to: { zone: k } })}
            >
              To {setup.zones.find((z) => z.id === parseZoneKey(k).zoneId)?.name}
            </Button>
          ))}
          {seen !== 'back' && (
            <IconButton label="Zoom" onClick={() => onZoom(p.id)}>
              <Maximize2 />
            </IconButton>
          )}
        </>
      )}
      <span className="flex-1" />
      <IconButton
        label={placing ? 'Cancel' : 'Done'}
        onClick={() => select(placing ? selected : null)}
      >
        <X />
      </IconButton>
    </div>
  )
}
