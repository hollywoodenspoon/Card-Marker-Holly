import { Columns2, Gauge, Mountain, MousePointer2, Package, Brush, Play, Square } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { cn } from '@/lib/cn'
import { type Mode, useEngine } from '../store/engineStore'
import { useView } from '../store/viewStore'
import { playGame } from '../runtime/play'

const MODES: {
  id: Mode | 'objects' | 'play'
  label: string
  key: string
  icon: typeof Brush
  soon?: boolean
}[] = [
  { id: 'terrain', label: 'Terrain', key: 'T', icon: Mountain },
  { id: 'paint', label: 'Paint', key: 'P', icon: Brush },
  { id: 'tile', label: 'Tile', key: 'E', icon: MousePointer2 },
  { id: 'objects', label: 'Objects', key: 'O', icon: Package, soon: true },
  { id: 'play', label: 'Play', key: 'Space', icon: Play },
]

/**
 * The always-visible mode switch at the top of the canvas (from the engine
 * plan): the mode decides what a click does, and the side panels follow it.
 */
export function ModeBar() {
  const mode = useEngine((s) => s.mode)
  const layout = useView((s) => s.layout)
  const perf = useView((s) => s.perfMeter)
  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b bg-panel px-2 py-1"
      role="toolbar"
      aria-label="Modes"
    >
      {MODES.map((m) => (
        <Button
          key={m.id}
          size="sm"
          variant="ghost"
          active={mode === m.id}
          disabled={m.soon}
          title={m.soon ? `${m.label} (${m.key}) — coming soon` : `${m.label} (${m.key})`}
          onClick={() => {
            if (m.soon) return
            if (m.id === 'play') playGame(true)
            else useEngine.getState().setMode(m.id as Mode)
          }}
          className={cn('gap-1.5', m.soon && 'opacity-50')}
        >
          <m.icon /> {m.label}
          <kbd className="rounded border px-1 text-[10px] text-muted-foreground">{m.key}</kbd>
        </Button>
      ))}
      <div className="flex-1" />
      <IconButton
        label={layout === 'quad' ? 'One view' : 'Four views'}
        active={layout === 'quad'}
        onClick={() => useView.getState().setLayout(layout === 'quad' ? 'single' : 'quad')}
      >
        {layout === 'quad' ? <Square /> : <Columns2 />}
      </IconButton>
      <IconButton
        label="Performance meter"
        active={perf}
        onClick={() => useView.getState().togglePerf()}
      >
        <Gauge />
      </IconButton>
    </div>
  )
}
