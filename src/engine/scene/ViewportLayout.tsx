/**
 * The viewport area: one pane by default, a 3ds Max-style quad (Top / Front /
 * Side / Perspective) on demand, and any pane maximised by double-clicking its
 * header. Each pane picks its view, switches ortho/perspective and changes its
 * FOV; the Game camera view turns in 90° steps and tilts, and is saved with
 * the map. All 3D panes share one renderer (viewport3d.ts); a 2D pane is drawn
 * on its own canvas (Map2DView), and is all you get when WebGL is missing.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Minimize2, RotateCcw, RotateCw } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { Slider } from '@/ui/components/ui/slider'
import { cn } from '@/lib/cn'
import { useEngine } from '../store/engineStore'
import { usePerf, useView } from '../store/viewStore'
import { Map2DView } from './Map2DView'
import { clampFov, FOV_MAX, FOV_MIN, FOV_STEP, VIEW_LABELS, type ViewName } from './viewMath'
import { viewportApi } from './viewportApi'
import { Viewport3D, webglAvailable } from './viewport3d'

const VIEW_ORDER: ViewName[] = [
  'persp',
  'game',
  'top',
  'front',
  'back',
  'left',
  'right',
  'bottom',
  '2d',
]

export function ViewportLayout() {
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [engine, setEngine] = useState<Viewport3D | null>(null)
  const [gl] = useState(webglAvailable)
  const layout = useView((s) => s.layout)
  const maximised = useView((s) => s.maximised)
  const perf = useView((s) => s.perfMeter)

  useEffect(() => {
    if (!gl) return
    const e = new Viewport3D(
      canvas.current!,
      host.current!,
      (i, view, ortho, fov) => {
        const p = useView.getState().panes[i]
        if (p.view !== view || p.ortho !== ortho || p.fov !== fov)
          useView.getState().setPane(i, { view, ortho, fov })
      },
      (i) => useView.getState().setActive(i),
    )
    viewportApi.engine = e
    setEngine(e)
    return () => {
      viewportApi.engine = null
      e.dispose()
    }
  }, [gl])

  const visible = layout === 'single' ? [0] : maximised !== null ? [maximised] : [0, 1, 2, 3]
  const quad = visible.length === 4

  return (
    <div
      ref={host}
      className="relative h-full w-full overflow-hidden"
      style={{ background: 'var(--canvas)' }}
    >
      {gl && <canvas ref={canvas} className="pointer-events-none absolute inset-0 h-full w-full" />}
      <div
        className={cn(
          'absolute inset-0 grid gap-px',
          quad ? 'grid-cols-2 grid-rows-2' : 'grid-cols-1',
        )}
      >
        {visible.map((i) => (
          <PaneView key={i} index={i} engine={engine} gl={gl} quad={quad} />
        ))}
      </div>
      {!gl && (
        <p className="pointer-events-none absolute bottom-3 right-3 rounded bg-panel/80 px-2 py-1 text-xs text-muted-foreground">
          3D isn't available here, so the map shows in 2D.
        </p>
      )}
      {perf && <PerfMeter />}
    </div>
  )
}

function PaneView({
  index,
  engine,
  gl,
  quad,
}: {
  index: number
  engine: Viewport3D | null
  gl: boolean
  quad: boolean
}) {
  const conf = useView((s) => s.panes[index])
  const active = useView((s) => s.active === index)
  const layout = useView((s) => s.layout)
  const body = useRef<HTMLDivElement>(null)
  const is2d = conf.view === '2d' || !gl
  const tilt = useEngine((s) => s.map.camera.tilt)

  // Attach this pane's 3D camera (re-attach when it turns 3D again).
  useEffect(() => {
    if (!engine || is2d || !body.current) return
    const { view, ortho, fov } = useView.getState().panes[index]
    engine.attach(index, body.current, view, ortho, fov)
    return () => engine.detach(index)
  }, [engine, is2d, index])

  const cam = () => engine?.pane(index)
  const setView = (view: ViewName) => {
    useView.getState().setPane(index, { view })
    const c = cam()
    if (c && view !== '2d') {
      c.setView(view)
      engine?.report(index)
    }
  }
  const setOrtho = (ortho: boolean) => {
    const c = cam()
    c?.setOrtho(ortho)
    useView.getState().setPane(index, { ortho })
    engine?.report(index)
  }
  const setFov = (fov: number) => {
    const f = clampFov(fov)
    const c = cam()
    c?.setFov(f)
    useView.getState().setPane(index, { fov: f })
    engine?.report(index)
  }
  const activate = useCallback(() => useView.getState().setActive(index), [index])

  return (
    <div
      className={cn(
        'relative flex min-h-0 min-w-0 flex-col',
        quad && active && 'ring-1 ring-accent/70',
      )}
      onPointerDownCapture={activate}
    >
      <header
        className="z-10 flex shrink-0 flex-wrap items-center gap-1.5 bg-panel/85 px-2 py-1 text-xs backdrop-blur"
        onDoubleClick={() => layout === 'quad' && useView.getState().toggleMaximise(index)}
      >
        <NativeSelect
          aria-label="View"
          className="h-7 w-auto py-0 text-xs md:h-7"
          value={conf.view}
          onChange={(e) => setView(e.target.value as ViewName)}
        >
          {VIEW_ORDER.map((v) => (
            <option key={v} value={v} disabled={!gl && v !== '2d'}>
              {VIEW_LABELS[v]}
            </option>
          ))}
          {conf.view === 'user' && <option value="user">User</option>}
        </NativeSelect>
        {!is2d && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 md:h-7"
            title="Switch between orthographic and perspective"
            onClick={() => setOrtho(!conf.ortho)}
          >
            {conf.ortho ? 'Ortho' : 'Persp'}
          </Button>
        )}
        {!is2d && !conf.ortho && (
          <div className="flex items-center gap-1" title="Field of view ( [ and ] step it )">
            <span className="text-muted-foreground">FOV</span>
            <Slider
              aria-label="Field of view"
              className="h-7 w-24 md:h-7"
              min={FOV_MIN}
              max={FOV_MAX}
              step={1}
              value={[conf.fov]}
              onValueChange={([v]) => setFov(v)}
            />
            <input
              aria-label="Field of view in degrees"
              type="number"
              min={FOV_MIN}
              max={FOV_MAX}
              value={conf.fov}
              onChange={(e) => e.target.value && setFov(Number(e.target.value))}
              className="h-7 w-12 rounded border border-input bg-panel px-1 text-right tabular-nums"
            />
            <span className="text-muted-foreground">°</span>
            <IconButton
              label={`FOV −${FOV_STEP}`}
              size="icon-sm"
              className="size-7 md:size-7"
              onClick={() => setFov(conf.fov - FOV_STEP)}
            >
              <span className="text-sm leading-none">−</span>
            </IconButton>
            <IconButton
              label={`FOV +${FOV_STEP}`}
              size="icon-sm"
              className="size-7 md:size-7"
              onClick={() => setFov(conf.fov + FOV_STEP)}
            >
              <span className="text-sm leading-none">+</span>
            </IconButton>
          </div>
        )}
        {conf.view === 'game' && !is2d && (
          <div className="flex items-center gap-1">
            <IconButton
              label="Turn left (Q)"
              size="icon-sm"
              className="size-7 md:size-7"
              onClick={() => {
                cam()?.turnGame(-1)
                engine?.report(index)
              }}
            >
              <RotateCcw />
            </IconButton>
            <IconButton
              label="Turn right (E)"
              size="icon-sm"
              className="size-7 md:size-7"
              onClick={() => {
                cam()?.turnGame(1)
                engine?.report(index)
              }}
            >
              <RotateCw />
            </IconButton>
            <span className="text-muted-foreground">Tilt</span>
            <Slider
              aria-label="Tilt"
              className="h-7 w-20 md:h-7"
              min={0}
              max={100}
              step={1}
              value={[Math.round(tilt * 100)]}
              onValueChange={([v]) => {
                cam()?.setGameTilt(v / 100)
                engine?.report(index)
              }}
            />
          </div>
        )}
        <div className="flex-1" />
        {layout === 'quad' && (
          <IconButton
            label={useView.getState().maximised === index ? 'Restore' : 'Maximise'}
            size="icon-sm"
            className="size-7 md:size-7"
            onClick={() => useView.getState().toggleMaximise(index)}
          >
            {useView.getState().maximised === index ? <Minimize2 /> : <Maximize2 />}
          </IconButton>
        )}
      </header>
      <div ref={body} className="relative min-h-0 flex-1 touch-none">
        {is2d && <Map2DView onActive={activate} />}
      </div>
    </div>
  )
}

/**
 * The editor draws only when something changes, so "redraws/s" is how often it
 * actually drew (0 when idle), not a ceiling; "frame" is the CPU time of the last
 * draw, the number to watch for smoothness.
 */
function PerfMeter() {
  const p = usePerf()
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-20 rounded-md bg-black/70 px-3 py-2 font-mono text-[11px] leading-5 text-white">
      <div>
        {p.fps} redraws/s · frame {p.frameMs} ms
      </div>
      <div>
        {p.drawCalls} draw calls · {p.faces.toLocaleString()} faces
      </div>
      <div className={cn(p.editMs > 50 && 'text-red-300')}>last edit {p.editMs.toFixed(1)} ms</div>
      {p.memoryMb !== null && <div>{p.memoryMb} MB</div>}
    </div>
  )
}
