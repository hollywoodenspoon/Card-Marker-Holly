import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { bounds, pathData, transform, type Pt } from '@/vector/geometry'
import { buildShape } from '@/vector/shapes'
import { IconButton } from '@/ui/components/ui/button'
import {
  Circle,
  Image as ImageIcon,
  Minus,
  MousePointer2,
  Pentagon,
  Plus,
  Square,
  SquareStack,
  UserRound,
} from '@/ui/icons'
import { newArea, newObject, type PictureScene } from '../model/game'
import { useGame } from '../store/gameStore'
import { SceneView } from './SceneView'

type Tool = 'select' | 'rect' | 'ellipse' | 'polygon' | 'spot' | 'card' | 'image'

const TOOLS: { id: Tool; label: string; icon: typeof Square; key: string }[] = [
  { id: 'select', label: 'Select and move (V)', icon: MousePointer2, key: 'v' },
  { id: 'rect', label: 'Click area: rectangle (R)', icon: Square, key: 'r' },
  { id: 'ellipse', label: 'Click area: ellipse (L)', icon: Circle, key: 'l' },
  { id: 'polygon', label: 'Click area: polygon, click each corner (G)', icon: Pentagon, key: 'g' },
  { id: 'spot', label: 'Character spot (C)', icon: UserRound, key: 'c' },
  { id: 'card', label: 'Card (K)', icon: SquareStack, key: 'k' },
  { id: 'image', label: 'Picture (I)', icon: ImageIcon, key: 'i' },
]

type Drag =
  | { kind: 'box'; from: Pt; to: Pt }
  | { kind: 'move'; id: string; what: 'area' | 'object'; last: Pt }
  | {
      kind: 'resize'
      id: string
      what: 'area' | 'object'
      anchor: Pt
      start: { x: number; y: number; w: number; h: number }
    }

/**
 * Editing a picture scene: draw click areas (rectangle, ellipse, polygon here; any
 * shape with the pen in the Vector Maker, from the properties panel), place
 * character spots, cards and pictures, and move or resize anything. Areas are
 * outlined here and invisible to the player.
 */
export function PictureEditor({ scene }: { scene: PictureScene }) {
  const svg = useRef<SVGSVGElement>(null)
  const [tool, setTool] = useState<Tool>('select')
  const [drag, setDrag] = useState<Drag | null>(null)
  const [poly, setPoly] = useState<Pt[] | null>(null)
  const [cursor, setCursor] = useState<Pt | null>(null)
  const [zoom, setZoom] = useState(1)
  const selection = useGame((s) => s.selection)
  const commit = useGame((s) => s.commit)
  const select = useGame((s) => s.select)
  const selId = selection && 'id' in selection ? selection.id : null

  const toScene = (e: { clientX: number; clientY: number }): Pt => {
    const el = svg.current
    const m = el?.getScreenCTM()
    if (!el || !m) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    // Kept on the picture: nothing is drawn or dragged off its edges.
    const clamp = (v: number, max: number) => Math.round(Math.max(0, Math.min(max, v)))
    return { x: clamp(p.x, scene.width), y: clamp(p.y, scene.height) }
  }

  const edit = (recipe: (s: PictureScene) => void, key?: string) =>
    commit((g) => {
      const s = g.scenes.find((x) => x.id === scene.id)
      if (s?.kind === 'picture') recipe(s)
    }, key)

  const finishPolygon = (pts: Pt[]) => {
    setPoly(null)
    if (pts.length < 3) return
    const area = newArea(`Area ${scene.areas.length + 1}`, [
      { closed: true, anchors: pts.map((p) => ({ ...p })) },
    ])
    edit((s) => void s.areas.push(area))
    select({ kind: 'area', id: area.id })
    setTool('select')
  }

  // Keys: tools, Enter/Escape for the polygon, Delete for the selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (!svg.current?.getClientRects().length) return
      if (poly && e.key === 'Enter') return finishPolygon(poly)
      if (e.key === 'Escape') {
        setPoly(null)
        setDrag(null)
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection && 'id' in selection) {
        e.preventDefault()
        edit((s) => {
          s.areas = s.areas.filter((a) => a.id !== selection.id)
          s.objects = s.objects.filter((o) => o.id !== selection.id)
        })
        select(null)
        return
      }
      const hit = TOOLS.find((x) => x.key === e.key.toLowerCase())
      if (hit) setTool(hit.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const boxOf = (a: Pt, b: Pt) => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(b.x - a.x),
    h: Math.abs(b.y - a.y),
  })

  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    const p = toScene(e)
    if (tool === 'polygon') {
      const pts = poly ?? []
      // Clicking near the first corner closes the shape.
      if (pts.length >= 3 && Math.hypot(pts[0].x - p.x, pts[0].y - p.y) < 12 / zoom)
        return finishPolygon(pts)
      return setPoly([...pts, p])
    }
    if (tool !== 'select') {
      e.currentTarget.setPointerCapture(e.pointerId)
      return setDrag({ kind: 'box', from: p, to: p })
    }
    // Select: what's under the pointer (topmost first: objects over areas).
    const target = (e.target as Element).closest('[data-pick]')
    const id = target?.getAttribute('data-pick')
    const what = target?.getAttribute('data-what') as 'area' | 'object' | 'handle' | null
    if (what === 'handle' && selId) {
      const corner = target!.getAttribute('data-corner')!
      const box = selBox()
      if (!box) return
      const anchor = {
        x: corner.includes('l') ? box.x + box.w : box.x,
        y: corner.includes('t') ? box.y + box.h : box.y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      return setDrag({
        kind: 'resize',
        id: selId,
        what: selection!.kind as 'area' | 'object',
        anchor,
        start: box,
      })
    }
    if (id && (what === 'area' || what === 'object')) {
      select({ kind: what, id })
      e.currentTarget.setPointerCapture(e.pointerId)
      return setDrag({ kind: 'move', id, what, last: p })
    }
    select({ kind: 'scene' })
  }

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const p = toScene(e)
    setCursor(p)
    if (!drag) return
    if (drag.kind === 'box') return setDrag({ ...drag, to: p })
    if (drag.kind === 'move') {
      const dx = p.x - drag.last.x
      const dy = p.y - drag.last.y
      if (!dx && !dy) return
      edit((s) => {
        if (drag.what === 'object') {
          const o = s.objects.find((x) => x.id === drag.id)
          if (o) {
            o.x += dx
            o.y += dy
          }
        } else {
          const a = s.areas.find((x) => x.id === drag.id)
          if (a) a.paths = transform(a.paths, [1, 0, 0, 1, dx, dy])
        }
      }, `move:${drag.id}`)
      return setDrag({ ...drag, last: p })
    }
    // Resize from the opposite corner.
    const b = boxOf(drag.anchor, p)
    if (b.w < 4 || b.h < 4) return
    edit((s) => {
      if (drag.what === 'object') {
        const o = s.objects.find((x) => x.id === drag.id)
        if (o) Object.assign(o, b)
      } else {
        const a = s.areas.find((x) => x.id === drag.id)
        if (!a) return
        const cur = bounds(a.paths)
        if (!cur.w || !cur.h) return
        const sx = b.w / cur.w
        const sy = b.h / cur.h
        a.paths = transform(a.paths, [sx, 0, 0, sy, b.x - cur.x * sx, b.y - cur.y * sy])
      }
    }, `resize:${drag.id}`)
  }

  const onUp = () => {
    if (drag?.kind === 'box') {
      const b0 = boxOf(drag.from, drag.to)
      const tiny = b0.w < 6 || b0.h < 6
      if (tool === 'rect' || tool === 'ellipse') {
        if (!tiny) {
          const area = newArea(
            `Area ${scene.areas.length + 1}`,
            buildShape(tool === 'rect' ? 'rect' : 'ellipse', b0),
          )
          edit((s) => void s.areas.push(area))
          select({ kind: 'area', id: area.id })
          setTool('select')
        }
      } else {
        // A click without a drag places a default-sized object.
        const size =
          tool === 'card'
            ? { w: 160, h: 224 }
            : tool === 'spot'
              ? { w: 120, h: 200 }
              : { w: 200, h: 200 }
        const b = tiny ? { x: drag.from.x - size.w / 2, y: drag.from.y - size.h / 2, ...size } : b0
        const names = { spot: 'Character', card: 'Card', image: 'Picture' } as const
        const kind = tool as 'spot' | 'card' | 'image'
        const o = newObject(kind, `${names[kind]} ${scene.objects.length + 1}`, b)
        edit((s) => void s.objects.push(o))
        select({ kind: 'object', id: o.id })
        setTool('select')
      }
    }
    if (drag) useGame.getState().endStroke()
    setDrag(null)
  }

  function selBox() {
    if (!selection || !('id' in selection)) return null
    if (selection.kind === 'object') {
      const o = scene.objects.find((x) => x.id === selection.id)
      return o ? { x: o.x, y: o.y, w: o.w, h: o.h } : null
    }
    const a = scene.areas.find((x) => x.id === selection.id)
    return a ? bounds(a.paths) : null
  }

  const k = 1 / zoom
  const sb = selBox()
  const handle = Math.max(10, Math.min(scene.width, scene.height) / 80) * k
  const overlay = (
    <g>
      {scene.objects.map((o) => (
        <g
          key={o.id}
          data-pick={o.id}
          data-what="object"
          style={{ cursor: tool === 'select' ? 'move' : undefined }}
        >
          <rect
            x={o.x}
            y={o.y}
            width={o.w}
            height={o.h}
            fill={o.kind === 'spot' ? 'rgba(120,180,255,0.18)' : 'rgba(255,255,255,0.04)'}
            stroke={selId === o.id ? 'var(--color-accent, #f5a524)' : 'rgba(255,255,255,0.7)'}
            strokeWidth={2 * k}
            strokeDasharray={`${6 * k} ${4 * k}`}
          />
          <text
            x={o.x + 6 * k}
            y={o.y + 18 * k}
            fontSize={14 * k}
            fill="#fff"
            stroke="#000"
            strokeWidth={3 * k}
            paintOrder="stroke"
          >
            {o.name}
          </text>
        </g>
      ))}
      {scene.areas.map((a) => (
        <g
          key={a.id}
          data-pick={a.id}
          data-what="area"
          style={{ cursor: tool === 'select' ? 'move' : undefined }}
        >
          <path
            d={pathData(a.paths)}
            fillRule="evenodd"
            fill={selId === a.id ? 'rgba(245,165,36,0.22)' : 'rgba(245,165,36,0.1)'}
            stroke="var(--color-accent, #f5a524)"
            strokeWidth={(selId === a.id ? 3 : 2) * k}
            strokeDasharray={`${8 * k} ${5 * k}`}
          />
          <text
            x={bounds(a.paths).x + 6 * k}
            y={bounds(a.paths).y + 18 * k}
            fontSize={14 * k}
            fill="#fff"
            stroke="#000"
            strokeWidth={3 * k}
            paintOrder="stroke"
          >
            {a.name}
          </text>
        </g>
      ))}
      {sb &&
        tool === 'select' &&
        (['tl', 'tr', 'bl', 'br'] as const).map((c) => (
          <rect
            key={c}
            data-pick="handle"
            data-what="handle"
            data-corner={c}
            x={(c.includes('l') ? sb.x : sb.x + sb.w) - handle / 2}
            y={(c.includes('t') ? sb.y : sb.y + sb.h) - handle / 2}
            width={handle}
            height={handle}
            fill="#fff"
            stroke="#f5a524"
            strokeWidth={2 * k}
            style={{ cursor: c === 'tl' || c === 'br' ? 'nwse-resize' : 'nesw-resize' }}
          />
        ))}
      {drag?.kind === 'box' && (
        <rect
          {...(() => {
            const b = boxOf(drag.from, drag.to)
            return { x: b.x, y: b.y, width: b.w, height: b.h }
          })()}
          rx={tool === 'ellipse' ? 9999 : 0}
          fill="rgba(245,165,36,0.15)"
          stroke="#f5a524"
          strokeWidth={2 * k}
        />
      )}
      {poly && (
        <polyline
          points={[...poly, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(' ')}
          fill="rgba(245,165,36,0.15)"
          stroke="#f5a524"
          strokeWidth={2 * k}
        />
      )}
    </g>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex shrink-0 flex-wrap items-center gap-1 border-b bg-panel px-2 py-1"
        role="toolbar"
        aria-label="Scene tools"
      >
        {TOOLS.map((t) => (
          <IconButton
            key={t.id}
            label={t.label}
            size="icon-sm"
            aria-pressed={tool === t.id}
            data-testid={`scene-tool-${t.id}`}
            className={cn(tool === t.id && 'bg-accent-soft text-accent')}
            onClick={() => {
              setTool(t.id)
              setPoly(null)
            }}
          >
            <t.icon />
          </IconButton>
        ))}
        {tool === 'polygon' && (
          <span className="px-2 text-xs text-muted-foreground">
            Click each corner; click the first corner or press Enter to finish.
          </span>
        )}
        <span className="flex-1" />
        <IconButton
          label="Zoom out"
          size="icon-sm"
          onClick={() => setZoom((z) => Math.max(0.25, z / 1.25))}
        >
          <Minus />
        </IconButton>
        <button
          type="button"
          className="min-w-12 text-xs text-muted-foreground"
          onClick={() => setZoom(1)}
          title="Fit"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton
          label="Zoom in"
          size="icon-sm"
          onClick={() => setZoom((z) => Math.min(8, z * 1.25))}
        >
          <Plus />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-auto bg-[#1b1b1f] p-4">
        <div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }} className="mx-auto">
          <SceneView
            scene={scene}
            mode="edit"
            svgRef={svg}
            overlay={overlay}
            className={cn('block h-full w-full', tool !== 'select' && 'cursor-crosshair')}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
          />
        </div>
      </div>
    </div>
  )
}
