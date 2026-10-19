import {
  CircleMinus,
  CirclePlus,
  Hand,
  MousePointer,
  MousePointer2,
  PenTool,
  Shapes,
  Spline,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover'
import { pathData } from '../geometry'
import { buildShape, SHAPES } from '../shapes'
import { setTool, useVector, type Tool } from '../store'

const TOOLS: { id: Tool; label: string; key: string; icon: typeof Hand }[] = [
  { id: 'select', label: 'Selection', key: 'V', icon: MousePointer2 },
  { id: 'direct', label: 'Direct selection', key: 'A', icon: MousePointer },
  { id: 'pen', label: 'Pen', key: 'P', icon: PenTool },
  { id: 'addAnchor', label: 'Add anchor point', key: '+', icon: CirclePlus },
  { id: 'deleteAnchor', label: 'Delete anchor point', key: '−', icon: CircleMinus },
  { id: 'convert', label: 'Anchor point (convert)', key: 'Shift C', icon: Spline },
  { id: 'shape', label: 'Shapes', key: 'U', icon: Shapes },
  { id: 'hand', label: 'Hand', key: 'H', icon: Hand },
]

const btn =
  'flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted md:size-10'

/** The tool buttons (a column on desktop, a row on phone). */
export function ToolBar({ horizontal }: { horizontal?: boolean }) {
  const tool = useVector((s) => s.tool)
  return (
    <nav
      aria-label="Tools"
      className={cn(
        'flex shrink-0 gap-1 bg-panel p-1.5',
        horizontal ? 'overflow-x-auto border-t' : 'flex-col overflow-y-auto border-r',
      )}
    >
      {TOOLS.map((t) =>
        t.id === 'shape' ? (
          <ShapePicker key={t.id} active={tool === 'shape'} />
        ) : (
          <button
            key={t.id}
            type="button"
            title={`${t.label} (${t.key})`}
            aria-label={t.label}
            aria-pressed={tool === t.id}
            onClick={() => setTool(t.id)}
            className={cn(btn, tool === t.id && 'bg-accent-soft text-accent hover:bg-accent-soft')}
          >
            <t.icon className="size-5" />
          </button>
        ),
      )}
    </nav>
  )
}

function ShapePicker({ active }: { active: boolean }) {
  const [open, setOpen] = useState(false)
  const shapeId = useVector((s) => s.shapeId)
  const groups = ['Basic', 'Symbols', 'Arrows'] as const
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Shapes (U)"
          aria-label="Shapes"
          aria-pressed={active}
          onClick={() => setTool('shape')}
          className={cn(btn, active && 'bg-accent-soft text-accent hover:bg-accent-soft')}
        >
          <Shapes className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80">
        <div className="flex max-h-[60dvh] flex-col gap-3 overflow-auto">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-1 text-xs font-semibold text-muted-foreground">{g}</div>
              <div className="grid grid-cols-5 gap-1">
                {SHAPES.filter((s) => s.group === g).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    title={s.label}
                    aria-label={s.label}
                    aria-pressed={shapeId === s.id}
                    onClick={() => {
                      useVector.setState({ shapeId: s.id, tool: 'shape', penPathId: null })
                      setOpen(false)
                    }}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md border p-1.5 hover:border-accent',
                      shapeId === s.id && 'border-accent bg-accent-soft',
                    )}
                  >
                    <svg viewBox="-4 -4 108 108" className="size-full" aria-hidden>
                      <path
                        d={pathData(buildShape(s.id, { x: 0, y: 0, w: 100, h: 100 }))}
                        fill={s.open ? 'none' : 'currentColor'}
                        fillRule="evenodd"
                        stroke={s.open ? 'currentColor' : 'none'}
                        strokeWidth={6}
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Drag on the artboard to draw it (Shift = equal sides, Alt = from the centre), or click
            for a 100 px shape.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
