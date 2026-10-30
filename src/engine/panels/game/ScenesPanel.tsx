import { cn } from '@/lib/cn'
import { Button, IconButton } from '@/ui/components/ui/button'
import { askConfirm, askText } from '@/ui/components/feedback'
import { Flag, Image as ImageIcon, Map as MapIcon, Pencil, Play, Plus, Trash2 } from '@/ui/icons'
import { addScene, deleteScene, showScene } from '../../storage/gameActions'
import { useGame } from '../../store/gameStore'
import { startRuntime } from '../../runtime/runtime'

/** The game's scenes: pictures with click areas, and 3D maps. */
export function ScenesPanel() {
  const scenes = useGame((s) => s.game.scenes)
  const start = useGame((s) => s.game.startScene)
  const view = useGame((s) => s.view)
  const remove = async (id: string, name: string) => {
    const ok = await askConfirm({
      title: `Delete ${name}?`,
      description: 'You can undo this.',
      okLabel: 'Delete',
      danger: true,
    })
    if (ok) deleteScene(id)
  }
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => void addScene('picture')}>
          <Plus /> Picture scene
        </Button>
        <Button size="sm" variant="outline" onClick={() => void addScene('map')}>
          <Plus /> Map scene
        </Button>
      </div>
      <ul className="flex flex-col gap-1" aria-label="Scenes" data-testid="scenes-list">
        {scenes.map((s) => {
          const on = view.kind === 'scene' && view.id === s.id
          return (
            <li
              key={s.id}
              className={cn(
                'group flex items-center gap-1 rounded-md border',
                on ? 'border-accent bg-accent/10' : 'bg-panel',
              )}
            >
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-2 text-left text-sm md:min-h-9"
                aria-current={on || undefined}
                onClick={() => void showScene(s.id)}
              >
                {s.kind === 'map' ? (
                  <MapIcon className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{s.name}</span>
                {start === s.id && (
                  <span
                    className="ml-auto flex shrink-0 items-center gap-1 text-xs text-accent"
                    title="The game starts here"
                  >
                    <Flag className="size-3.5" /> Start
                  </span>
                )}
              </button>
              <IconButton
                label={`Rename ${s.name}`}
                onClick={async () => {
                  const name = await askText({ title: 'Rename scene', initial: s.name })
                  if (name)
                    useGame.getState().commit((g) => {
                      const x = g.scenes.find((y) => y.id === s.id)
                      if (x) x.name = name
                    })
                }}
              >
                <Pencil />
              </IconButton>
              <IconButton
                label={`Play from ${s.name}`}
                onClick={() => startRuntime(useGame.getState().game, s.id)}
              >
                <Play />
              </IconButton>
              <IconButton label={`Delete ${s.name}`} onClick={() => void remove(s.id, s.name)}>
                <Trash2 />
              </IconButton>
            </li>
          )
        })}
      </ul>
      {scenes.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No scenes yet. A picture scene is a background picture with click areas; a map scene is a
          3D map.
        </p>
      )}
    </div>
  )
}
