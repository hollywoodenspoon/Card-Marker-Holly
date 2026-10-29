import { Boxes, Brush, MousePointer2, Mountain, Trash2 } from '@/ui/icons'
import { Button } from '@/ui/components/ui/button'
import { cn } from '@/lib/cn'
import { blockAt } from '../model/map'
import { removeBlock } from '../tools/edit'
import { type Tool, useEngine } from '../store/engineStore'

const TOOLS: { id: Tool; label: string; icon: typeof Brush; hint: string }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, hint: 'Click a block to inspect it.' },
  {
    id: 'terrain',
    label: 'Terrain',
    icon: Mountain,
    hint: 'Click to raise a column · Alt-click to lower.',
  },
  {
    id: 'paint',
    label: 'Paint',
    icon: Brush,
    hint: 'Click a block to repaint it with the chosen type.',
  },
  {
    id: 'tile',
    label: 'Tile',
    icon: Boxes,
    hint: 'Click to place a block · Alt-click to remove one.',
  },
]

/** The editor's left panel: tool modes, the block palette, and selection info. */
export function ToolPanel() {
  const tool = useEngine((s) => s.tool)
  const brush = useEngine((s) => s.brush)
  const palette = useEngine((s) => s.map.palette.blocks)
  return (
    <div className="flex w-60 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-panel p-3">
      <Section title="Tools">
        <div className="grid grid-cols-2 gap-1.5">
          {TOOLS.map((t) => (
            <Button
              key={t.id}
              variant="outline"
              active={tool === t.id}
              className="justify-start"
              onClick={() => useEngine.getState().setTool(t.id)}
            >
              <t.icon /> {t.label}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Blocks">
        <div className="grid grid-cols-5 gap-1.5">
          {palette.map((b) => (
            <button
              key={b.id}
              type="button"
              title={b.name}
              aria-label={b.name}
              aria-pressed={brush === b.id}
              onClick={() => useEngine.getState().setBrush(b.id)}
              className={cn(
                'aspect-square rounded-md border-2 transition-transform hover:scale-105',
                brush === b.id ? 'border-accent' : 'border-transparent',
              )}
              style={{ background: b.color }}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {palette.find((b) => b.id === brush)?.name}
        </p>
      </Section>

      <Properties />

      <p className="mt-auto text-xs text-muted-foreground">
        {TOOLS.find((t) => t.id === tool)?.hint} Right-drag to orbit, middle-drag to pan, scroll to
        zoom.
      </p>
    </div>
  )
}

function Properties() {
  const selection = useEngine((s) => s.selection)
  const block = useEngine((s) => (s.selection ? blockAt(s.map, s.selection) : undefined))
  if (!selection) return null
  return (
    <Section title="Selection">
      <dl className="space-y-1 text-sm">
        <Row k="Cell" v={`${selection.x}, ${selection.y}, ${selection.z}`} />
        <Row k="Block" v={block?.type ?? 'empty'} />
      </dl>
      {block && (
        <Button
          variant="danger"
          size="sm"
          className="mt-2 w-full"
          onClick={() => {
            useEngine.getState().commit((m) => removeBlock(m, selection))
            useEngine.getState().endStroke()
            useEngine.getState().setSelection(null)
          }}
        >
          <Trash2 /> Delete block
        </Button>
      )}
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  )
}
