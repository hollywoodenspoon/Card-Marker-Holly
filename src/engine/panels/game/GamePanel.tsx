import { useRef, useState } from 'react'
import { newId } from '@/core/model/ids'
import { addPack, playtestDb, type PackRow } from '@/playtest/library'
import { getBackend } from '@/storage'
import type { ProjectEntry } from '@/storage/backend'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input, NativeSelect } from '@/ui/components/ui/input'
import { Section } from '@/ui/components/fields'
import { askConfirm, toast } from '@/ui/components/feedback'
import {
  AlertCircle,
  FileUp,
  LayoutTemplate,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Trash2,
} from '@/ui/icons'
import { loadGameCards, useGameCards } from '../../cards/gameCards'
import { sourceKey, type CardSource } from '../../model/game'
import { useGame } from '../../store/gameStore'

/** The game itself: its name, where its cards come from, its zones and recipes. */
export function GamePanel() {
  const game = useGame((s) => s.game)
  const commit = useGame((s) => s.commit)
  return (
    <div className="flex flex-col">
      <Section title="Game">
        <Input
          aria-label="Game name"
          className="h-11 md:h-8"
          value={game.name}
          onChange={(e) => commit((g) => void (g.name = e.target.value), 'game-name')}
        />
        <p className="text-xs text-muted-foreground">
          {game.scenes.length} scenes · {game.decks.length} decks · {game.variables.length}{' '}
          variables
        </p>
      </Section>
      <SourcesSection />
      <ZonesSection />
      <RecipesSection />
    </div>
  )
}

function SourcesSection() {
  const sources = useGame((s) => s.game.sources)
  const commit = useGame((s) => s.commit)
  const status = useGameCards((s) => s.status)
  const progress = useGameCards((s) => s.progress)
  const error = useGameCards((s) => s.error)
  const missing = useGameCards((s) => s.missing)
  const count = useGameCards((s) => s.merged?.pack.info.cards.length ?? 0)
  const [projects, setProjects] = useState<ProjectEntry[]>([])
  const [packs, setPacks] = useState<PackRow[]>([])
  const file = useRef<HTMLInputElement>(null)

  const add = (src: CardSource) => {
    if (sources.some((s) => sourceKey(s) === sourceKey(src))) return
    commit((g) => void g.sources.push(src))
    void loadGameCards(useGame.getState().game)
  }
  const remove = async (src: CardSource) => {
    const ok = await askConfirm({
      title: `Stop using ${src.name}?`,
      description:
        'Its cards leave this game. Decks made in the game keep their lists. The project or pack itself is not touched.',
      okLabel: 'Remove',
    })
    if (!ok) return
    commit((g) => void (g.sources = g.sources.filter((s) => sourceKey(s) !== sourceKey(src))))
    void loadGameCards(useGame.getState().game)
  }
  const loadFile = async (f: File | undefined) => {
    if (!f) return
    try {
      const info = await addPack(new Uint8Array(await f.arrayBuffer()))
      add({ kind: 'pack', id: info.projectId, name: info.name })
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }
  const isMissing = (s: CardSource) => missing.some((m) => sourceKey(m) === sourceKey(s))

  return (
    <Section
      title="Card sources"
      action={
        <IconButton
          label="Reload cards"
          onClick={() => void loadGameCards(useGame.getState().game)}
        >
          <RefreshCw />
        </IconButton>
      }
    >
      <ul className="flex flex-col gap-1" data-testid="card-sources">
        {sources.map((s) => (
          <li key={sourceKey(s)} className="flex items-center gap-2 rounded-md border p-2 text-sm">
            {s.kind === 'project' ? (
              <LayoutTemplate className="size-4 shrink-0 text-accent" />
            ) : (
              <Package className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {s.name}
              <span className="block text-xs text-muted-foreground">
                {isMissing(s)
                  ? 'Not found in this browser'
                  : s.kind === 'project'
                    ? 'Cardworks project (live)'
                    : 'Game pack'}
              </span>
            </span>
            <IconButton label={`Remove ${s.name}`} onClick={() => void remove(s)}>
              <Trash2 />
            </IconButton>
          </li>
        ))}
      </ul>
      {sources.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add the card projects and packs this game uses. All of them together are the game’s cards.
        </p>
      )}
      <DropdownMenu
        onOpenChange={(o) => {
          if (!o) return
          void getBackend().listProjects().then(setProjects)
          void playtestDb().packs.orderBy('importedAt').reverse().toArray().then(setPacks)
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" data-testid="add-card-source">
            <Plus /> Add card source
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-80">
          <DropdownMenuLabel>Cardworks projects (live)</DropdownMenuLabel>
          {projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              disabled={p.missing}
              onSelect={() => add({ kind: 'project', id: p.id, name: p.name })}
            >
              <LayoutTemplate /> {p.name}
            </DropdownMenuItem>
          ))}
          {projects.length === 0 && <DropdownMenuItem disabled>No projects yet</DropdownMenuItem>}
          {packs.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Game packs</DropdownMenuLabel>
            </>
          )}
          {packs.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => add({ kind: 'pack', id: p.id, name: p.name })}
            >
              <Package /> {p.name} ({p.cardCount} cards)
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => file.current?.click()}>
            <FileUp /> Load a .cmpack file…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={file}
        type="file"
        accept=".cmpack,application/zip"
        className="hidden"
        onChange={(e) => {
          void loadFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
        {status === 'loading' && <Loader2 className="size-3.5 animate-spin" />}
        {status === 'error' && <AlertCircle className="size-3.5 text-danger" />}
        {status === 'loading'
          ? (progress ?? 'Loading cards…')
          : status === 'error'
            ? error
            : status === 'ready'
              ? `${count} cards`
              : ''}
      </p>
    </Section>
  )
}

function ZonesSection() {
  const zones = useGame((s) => s.game.zones)
  const commit = useGame((s) => s.commit)
  return (
    <Section
      title="Zones"
      foldable
      action={
        <IconButton
          label="Add zone"
          onClick={() =>
            commit(
              (g) =>
                void g.zones.push({ id: newId(), name: 'New zone', owner: 'player', faceUp: true }),
            )
          }
        >
          <Plus />
        </IconButton>
      }
    >
      <p className="text-xs text-muted-foreground">
        Named piles cards can be in while playing (Hand, Discard…).
      </p>
      {zones.map((z) => (
        <div key={z.id} className="flex items-center gap-1">
          <Input
            aria-label="Zone name"
            className="h-9 min-w-0 flex-1 md:h-8"
            value={z.name}
            onChange={(e) =>
              commit((g) => {
                const x = g.zones.find((y) => y.id === z.id)
                if (x) x.name = e.target.value
              }, `zone:${z.id}`)
            }
          />
          <NativeSelect
            aria-label="Whose"
            className="h-9 w-24 text-xs md:h-8"
            value={`${z.owner}:${z.faceUp ? 'up' : 'down'}`}
            onChange={(e) => {
              const [owner, face] = e.target.value.split(':')
              commit((g) => {
                const x = g.zones.find((y) => y.id === z.id)
                if (!x) return
                x.owner = owner as 'player' | 'shared'
                x.faceUp = face === 'up'
              })
            }}
          >
            <option value="player:up">Each, face up</option>
            <option value="player:down">Each, face down</option>
            <option value="shared:up">Shared, face up</option>
            <option value="shared:down">Shared, face down</option>
          </NativeSelect>
          <IconButton
            label={`Delete ${z.name}`}
            onClick={() => commit((g) => void (g.zones = g.zones.filter((y) => y.id !== z.id)))}
          >
            <Trash2 />
          </IconButton>
        </div>
      ))}
    </Section>
  )
}

function RecipesSection() {
  const recipes = useGame((s) => s.game.recipes)
  const commit = useGame((s) => s.commit)
  if (!recipes.length) return null
  return (
    <Section title="Recipes" foldable>
      <p className="text-xs text-muted-foreground">
        Saved steps, used with “Run a recipe”. Save one from any step list’s ⋯ menu.
      </p>
      {recipes.map((r) => (
        <div key={r.id} className="flex items-center gap-1">
          <Input
            aria-label="Recipe name"
            className="h-9 min-w-0 flex-1 md:h-8"
            value={r.name}
            onChange={(e) =>
              commit((g) => {
                const x = g.recipes.find((y) => y.id === r.id)
                if (x) x.name = e.target.value
              }, `recipe:${r.id}`)
            }
          />
          <span className="text-xs text-muted-foreground">{r.steps.length} steps</span>
          <IconButton
            label={`Delete ${r.name}`}
            onClick={() => commit((g) => void (g.recipes = g.recipes.filter((y) => y.id !== r.id)))}
          >
            <Trash2 />
          </IconButton>
        </div>
      ))}
    </Section>
  )
}
