import { useEffect, useState } from 'react'
import { Download, Trash2 } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { downloadBlob } from '@/ui/actions/download'
import { deleteUrbanReplay, listUrbanReplays } from '@/playtest/library'
import { seatName, type UwReplay } from '@/urban/replay'
import { rulesLabel } from '@/urban/state'

/** Saved Urban Warfare matches: open one to watch it, export or delete it. */
export function UrbanReplays({
  packId,
  onOpen,
  onClose,
}: {
  packId: string
  onOpen: (r: UwReplay) => void
  onClose: () => void
}) {
  const [rows, setRows] = useState<UwReplay[] | null>(null)
  const load = () => void listUrbanReplays(packId).then(setRows)
  useEffect(() => {
    void listUrbanReplays(packId).then(setRows)
  }, [packId])

  const result = (r: UwReplay) =>
    r.winner === null
      ? 'Unfinished'
      : r.winner === 'draw'
        ? 'Draw'
        : `${seatName(r, r.winner)} won (${r.reason === 'battleline' ? 'Battleline Victory' : r.reason === 'objective' ? 'Objective Victory' : 'Attrition Victory'})`

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-2 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Replays</h2>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Back
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Every finished game is kept here (the last 100).
      </p>
      {rows?.length === 0 && <p className="text-sm text-muted-foreground">No replays yet.</p>}
      <ul className="flex flex-col gap-1.5">
        {rows?.map((r) => (
          <li key={r.id} className="flex items-center gap-2 rounded-md border bg-panel p-2 text-sm">
            <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onOpen(r)}>
              <span className="block truncate font-medium">
                {seatName(r, 0)} vs {seatName(r, 1)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {result(r)} · {r.moves.length} moves · {rulesLabel(r.start.rules)} ·{' '}
                {new Date(r.savedAt).toLocaleString()}
              </span>
            </button>
            <IconButton
              label="Export"
              onClick={() =>
                downloadBlob(
                  new Blob([JSON.stringify(r)], { type: 'application/json' }),
                  `urban-replay-${new Date(r.savedAt).toISOString().slice(0, 10)}.json`,
                )
              }
            >
              <Download />
            </IconButton>
            <IconButton label="Delete" onClick={() => void deleteUrbanReplay(r.id).then(load)}>
              <Trash2 />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  )
}
