import { useRef, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { addPack, playtestDb, type PackRow } from '@/playtest/library'
import { Button } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { toast } from '@/ui/components/feedback'
import { Check, ChevronDown, FileUp, LayoutTemplate, Package } from '@/ui/icons'
import type { CardSource } from '../model/map'
import { useEngine } from '../store/engineStore'

/**
 * "Cards: …" in the Engine's top bar: where this map's cards come from. Either the
 * project open in Cards (live: edits there show up here), or a game pack loaded into
 * the Engine (a fixed copy). Packs are shared with Play.
 */
export function CardSourceMenu() {
  const cards = useEngine((s) => s.map.cards)
  const project = useEditor((s) => s.doc?.project)
  const [packs, setPacks] = useState<PackRow[]>([])
  const file = useRef<HTMLInputElement>(null)

  const choose = (c: CardSource) =>
    useEngine.getState().commit((m) => {
      m.cards = c
    })

  const load = async (f: File | undefined) => {
    if (!f) return
    try {
      const info = await addPack(new Uint8Array(await f.arrayBuffer()))
      choose({ kind: 'pack', id: info.projectId, name: info.name })
      toast(`Loaded ${info.name}.`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  const label = cards ? `${cards.name}${cards.kind === 'pack' ? ' (pack)' : ''}` : 'none'
  return (
    <>
      <DropdownMenu
        onOpenChange={(o) => {
          if (o) void playtestDb().packs.orderBy('importedAt').reverse().toArray().then(setPacks)
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="min-w-0" data-testid="engine-cards">
            <span className="truncate">
              <span className="text-muted-foreground">Cards:</span> {label}
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-w-80">
          <DropdownMenuLabel>Cards for this map</DropdownMenuLabel>
          {project ? (
            <DropdownMenuItem
              onSelect={() => choose({ kind: 'project', id: project.id, name: project.name })}
            >
              <LayoutTemplate /> This Cardworks project: {project.name}
              {cards?.kind === 'project' && cards.id === project.id && (
                <Check className="ml-auto" />
              )}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <LayoutTemplate /> Open a project in Cards to use it live
            </DropdownMenuItem>
          )}
          {packs.length > 0 && <DropdownMenuSeparator />}
          {packs.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => choose({ kind: 'pack', id: p.id, name: p.name })}
            >
              <Package /> {p.name} (pack, {p.cardCount} cards)
              {cards?.kind === 'pack' && cards.id === p.id && <Check className="ml-auto" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => file.current?.click()}>
            <FileUp /> Load .cmpack…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={file}
        type="file"
        accept=".cmpack,application/zip"
        className="hidden"
        onChange={(e) => {
          void load(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}
