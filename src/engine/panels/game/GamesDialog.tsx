import { useEffect, useState } from 'react'
import { Copy, FilePlus2, Trash2 } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Input } from '@/ui/components/ui/input'
import { askConfirm } from '@/ui/components/feedback'
import {
  createGame,
  deleteGame,
  duplicateGame,
  flushGame,
  openGame,
  renameGame,
} from '../../storage/gameActions'
import { games, type GameSummary } from '../../storage/games'
import { useGame } from '../../store/gameStore'

/** Browse, open, rename, duplicate and delete games. */
export function GamesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Games" description="Open, rename, duplicate or delete your games.">
        {open && <GamesList onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function GamesList({ onClose }: { onClose: () => void }) {
  const currentId = useGame((s) => s.game.id)
  const currentName = useGame((s) => s.game.name)
  const [rows, setRows] = useState<GameSummary[]>([])
  const refresh = () => flushGame().then(() => games.list().then(setRows))
  useEffect(() => {
    void refresh()
  }, [currentName])
  return (
    <div className="space-y-3">
      <Button onClick={() => void createGame().then(onClose)}>
        <FilePlus2 /> New game
      </Button>
      <ul className="max-h-[50vh] space-y-1 overflow-y-auto" data-testid="games-list">
        {rows.map((g) => {
          const current = g.id === currentId
          return (
            <li
              key={g.id}
              className="flex items-center gap-2 rounded-md border bg-panel p-2"
              aria-current={current || undefined}
            >
              <Input
                className="h-9 flex-1"
                defaultValue={current ? currentName : g.name}
                aria-label="Game name"
                onBlur={(e) => {
                  if (e.target.value.trim() && e.target.value !== g.name)
                    void renameGame(g.id, e.target.value).then(refresh)
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              {current ? (
                <span className="px-2 text-xs text-accent">Open</span>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void openGame(g.id).then(onClose)}
                >
                  Open
                </Button>
              )}
              <IconButton
                label="Duplicate"
                size="icon-sm"
                onClick={() => void duplicateGame(g.id).then(refresh)}
              >
                <Copy />
              </IconButton>
              <IconButton
                label="Delete"
                size="icon-sm"
                onClick={async () => {
                  const ok = await askConfirm({
                    title: `Delete ${g.name}?`,
                    description:
                      'Its scenes, maps, decks and pictures are deleted. Card projects and packs are not touched.',
                    okLabel: 'Delete',
                    danger: true,
                  })
                  if (ok) await deleteGame(g.id).then(refresh)
                }}
              >
                <Trash2 />
              </IconButton>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
