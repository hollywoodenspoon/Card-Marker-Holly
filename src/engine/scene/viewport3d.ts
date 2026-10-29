/**
 * Every 3D pane drawn by one WebGLRenderer into one canvas (a single GL context,
 * kind to low-end machines), each pane in its own scissor region with its own
 * camera. Drawing is on demand: nothing renders while nothing moves or changes.
 * Owns the shared scene (map meshes, lights, grid, highlights), picking for the
 * tools, the view cubes, and the numbers for the performance meter.
 */
import {
  Color,
  DirectionalLight,
  SRGBColorSpace,
  GridHelper,
  HemisphereLight,
  type LineLoop,
  Plane,
  Raycaster,
  Scene,
  TOUCH,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { cornerHeights, kindOf, tileAt, type MapDoc } from '../model/map'
import { useEngine } from '../store/engineStore'
import { usePerf } from '../store/viewStore'
import { applyTool, newStroke, type Stroke, type Target } from '../tools/apply'
import { WATER_DROP } from './chunkMesh'
import { makeFaceOutline, setFaceOutline } from './highlight'
import { MapScene } from './mapScene'
import { PaneCamera } from './paneCamera'
import { textureStore } from './textureStore'
import { CUBE_PX, ViewCube } from './viewCube'
import type { ViewName } from './viewMath'

type V3 = [number, number, number]

interface Pane {
  el: HTMLElement
  cam: PaneCamera
  off: () => void
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * The theme's `--canvas` colour as a Three.js Color. Themes use oklch(), which
 * Three.js can't parse, so a 1×1 canvas converts whatever CSS gives us to sRGB.
 */
const probe =
  typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
let lastCss = ''
const lastColor = new Color('#1c1c1f')
function canvasColor(el: HTMLElement): Color {
  const css = getComputedStyle(el).getPropertyValue('--canvas').trim() || '#1c1c1f'
  if (css === lastCss || !probe) return lastColor
  lastCss = css
  probe.clearRect(0, 0, 1, 1)
  probe.fillStyle = '#1c1c1f'
  probe.fillStyle = css
  probe.fillRect(0, 0, 1, 1)
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data
  return lastColor.setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
}

export class Viewport3D {
  readonly renderer: WebGLRenderer
  readonly scene = new Scene()
  readonly map: MapScene
  private grid: GridHelper | null = null
  private hover: LineLoop = makeFaceOutline(0xffd36b)
  private selected: LineLoop = makeFaceOutline(0x5fd0ff)
  private cube = new ViewCube()
  private panes = new Map<number, Pane>()
  private needsRender = true
  private raf = 0
  private unsubs: (() => void)[] = []
  private frames = 0
  private lastStat = performance.now()
  private lastFrameMs = 0
  private drawCalls = 0

  constructor(
    canvas: HTMLCanvasElement,
    private host: HTMLElement,
    private onPaneView: (index: number, view: ViewName, ortho: boolean, fov: number) => void,
    private onActive: (index: number) => void,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.info.autoReset = false
    this.map = new MapScene(textureStore)
    this.scene.add(this.map.group)
    this.scene.add(new HemisphereLight(0xffffff, 0x404050, 1.15))
    const sun = new DirectionalLight(0xffffff, 1.35)
    sun.position.set(12, 24, 8)
    this.scene.add(sun)
    this.scene.add(this.hover, this.selected)
    this.scene.background = null
    this.setMap(useEngine.getState().map, true)
    this.unsubs.push(
      useEngine.subscribe((s, prev) => {
        if (s.map !== prev.map) this.setMap(s.map, s.map.id !== prev.map.id)
        if (s.selection !== prev.selection || s.map !== prev.map) this.showSelection()
      }),
      textureStore.subscribe(() => this.invalidate()),
    )
    const themeObserver = new MutationObserver(() => this.invalidate())
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
    this.unsubs.push(() => themeObserver.disconnect())
    const ro = new ResizeObserver(() => this.invalidate())
    ro.observe(host)
    this.unsubs.push(() => ro.disconnect())
    this.loop()
  }

  invalidate = () => {
    this.needsRender = true
  }

  private setMap(map: MapDoc, fresh: boolean) {
    this.map.setMap(map)
    usePerf.setState({ editMs: this.map.lastBuildMs })
    if (fresh || !this.grid || this.grid.userData.size !== `${map.size.x}x${map.size.z}`) {
      if (this.grid) {
        this.scene.remove(this.grid)
        this.grid.geometry.dispose()
      }
      const n = Math.max(map.size.x, map.size.z)
      this.grid = new GridHelper(n, n, 0x888888, 0x444444)
      const m = this.grid.material as { opacity: number; transparent: boolean }
      m.opacity = 0.22
      m.transparent = true
      this.grid.position.set(n / 2, 0.001, n / 2)
      this.grid.userData.size = `${map.size.x}x${map.size.z}`
      this.scene.add(this.grid)
    }
    if (fresh) for (const p of this.panes.values()) this.frame(p.cam, map)
    for (const p of this.panes.values()) {
      if (p.cam.view === 'game') {
        p.cam.game = { ...map.camera }
        if (fresh) p.cam.setView('game', false)
      } else p.cam.game = { ...map.camera }
    }
    this.invalidate()
  }

  private frame(cam: PaneCamera, map: MapDoc) {
    let top = 0
    for (const t of map.tiles) if (t) top = Math.max(top, t.h / 2)
    const center = new Vector3(map.size.x / 2, top / 2, map.size.z / 2)
    cam.frame(center, Math.hypot(map.size.x, map.size.z) * 0.5 + 1)
  }

  /** Register a pane's DOM element; returns its camera. */
  attach(index: number, el: HTMLElement, view: ViewName, ortho: boolean, fov: number): PaneCamera {
    this.detach(index)
    const cam = new PaneCamera(el, new Vector3(8, 1, 8), this.invalidate)
    cam.controls.touches = { ONE: null as unknown as TOUCH, TWO: TOUCH.DOLLY_PAN }
    cam.game = { ...useEngine.getState().map.camera }
    this.frame(cam, useEngine.getState().map)
    cam.fov = fov
    cam.persp.fov = fov
    cam.persp.updateProjectionMatrix()
    cam.setView(view, false)
    if (view === 'persp' || view === 'user' || view === 'game') cam.setOrtho(ortho, false)
    const off = this.wire(index, el, cam)
    this.panes.set(index, { el, cam, off })
    this.invalidate()
    return cam
  }

  detach(index: number) {
    const p = this.panes.get(index)
    if (!p) return
    p.off()
    p.cam.dispose()
    this.panes.delete(index)
    this.invalidate()
  }

  pane(index: number): PaneCamera | undefined {
    return this.panes.get(index)?.cam
  }

  /** Report a pane's camera state back to the preferences (and the map, for the Game camera). */
  report(index: number) {
    const cam = this.pane(index)
    if (!cam) return
    this.onPaneView(index, cam.view, cam.isOrtho, cam.fov)
    if (cam.view === 'game') useEngine.getState().setCamera(cam.game)
  }

  // ---------- pointer → tools ----------

  private wire(index: number, el: HTMLElement, cam: PaneCamera) {
    const ray = new Raycaster()
    const ndc = new Vector2()
    const ground = new Plane(new Vector3(0, 1, 0), 0)
    const hit = new Vector3()
    let stroke: Stroke | null = null

    const target = (e: PointerEvent): Target | null => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(ndc, cam.camera)
      const p = this.map.pick(ray)
      if (p) {
        setFaceOutline(this.hover, p.corners, p.normal)
        return {
          x: p.info.x,
          z: p.info.z,
          face: p.info.face,
          overhang: p.info.overhang,
          y: p.point[1],
        }
      }
      const map = useEngine.getState().map
      if (ray.ray.intersectPlane(ground, hit)) {
        const x = Math.floor(hit.x)
        const z = Math.floor(hit.z)
        if (x >= 0 && z >= 0 && x < map.size.x && z < map.size.z) {
          setFaceOutline(
            this.hover,
            [
              [x, 0, z],
              [x, 0, z + 1],
              [x + 1, 0, z + 1],
              [x + 1, 0, z],
            ],
            [0, 1, 0],
          )
          return { x, z, face: 'top', ground: true, y: 0 }
        }
      }
      this.hover.visible = false
      return null
    }

    /** The view cube's square in this pane, as 0–1 coordinates, if the pointer is on it. */
    const onCube = (e: PointerEvent): [number, number] | null => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - (r.right - CUBE_PX - 6)
      const y = e.clientY - (r.top + 6)
      if (x < 0 || y < 0 || x > CUBE_PX || y > CUBE_PX) return null
      return [x / CUBE_PX, y / CUBE_PX]
    }

    const down = (e: PointerEvent) => {
      this.onActive(index)
      if (e.button !== 0) return
      const c = onCube(e)
      if (c) {
        const dir = this.cube.hit(cam.camera, c[0], c[1])
        if (dir) {
          cam.lookFrom(dir)
          this.report(index)
        }
        return
      }
      const t = target(e)
      if (!t) return
      el.setPointerCapture(e.pointerId)
      stroke = newStroke()
      applyTool(t, { alt: e.altKey, shift: e.shiftKey }, stroke)
      this.invalidate()
    }
    const move = (e: PointerEvent) => {
      if (onCube(e) && !stroke) {
        this.hover.visible = false
        el.style.cursor = 'pointer'
        this.invalidate()
        return
      }
      el.style.cursor = ''
      const t = target(e)
      if (stroke && t && e.buttons & 1) applyTool(t, { alt: e.altKey, shift: e.shiftKey }, stroke)
      this.invalidate()
    }
    const up = () => {
      if (stroke) useEngine.getState().endStroke()
      stroke = null
    }
    const leave = () => {
      this.hover.visible = false
      this.invalidate()
    }
    const noMenu = (e: Event) => e.preventDefault()
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('contextmenu', noMenu)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('contextmenu', noMenu)
    }
  }

  /** The cyan outline on the inspected tile's top (or overhang block's top). */
  private showSelection() {
    const s = useEngine.getState()
    const sel = s.selection
    const t = sel && tileAt(s.map, sel.x, sel.z)
    if (sel?.overhang) {
      const { x, y, z } = sel.overhang
      setFaceOutline(
        this.selected,
        [
          [x, y + 1, z],
          [x, y + 1, z + 1],
          [x + 1, y + 1, z + 1],
          [x + 1, y + 1, z],
        ],
        [0, 1, 0],
      )
    } else if (sel && t) {
      const drop = kindOf(s.map, t) === 'water' ? WATER_DROP : 0
      const [nw, ne, se, sw] = cornerHeights(t).map((h) => h / 2 - drop)
      const { x, z } = sel
      setFaceOutline(
        this.selected,
        [
          [x, nw, z],
          [x, sw, z + 1],
          [x + 1, se, z + 1],
          [x + 1, ne, z],
        ] as [V3, V3, V3, V3],
        [0, 1, 0],
      )
    } else this.selected.visible = false
    this.invalidate()
  }

  // ---------- drawing ----------

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop)
    let moving = false
    for (const p of this.panes.values()) if (p.cam.update()) moving = true
    if (this.needsRender || moving) {
      this.needsRender = false
      this.draw()
    }
    const now = performance.now()
    if (now - this.lastStat > 500) {
      const st = this.map.stats()
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
      usePerf.setState({
        fps: Math.round((this.frames * 1000) / (now - this.lastStat)),
        frameMs: Math.round(this.lastFrameMs * 10) / 10,
        drawCalls: this.drawCalls,
        faces: st.faces,
        memoryMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
      })
      this.frames = 0
      this.lastStat = now
    }
  }

  private draw() {
    const t0 = performance.now()
    const r = this.renderer
    const box = this.host.getBoundingClientRect()
    const w = Math.max(1, Math.round(box.width))
    const h = Math.max(1, Math.round(box.height))
    const size = r.getSize(new Vector2())
    if (size.x !== w || size.y !== h) r.setSize(w, h, false)
    r.info.reset()
    r.setScissorTest(true)
    r.setClearColor(canvasColor(this.host), 1)
    r.setViewport(0, 0, w, h)
    r.setScissor(0, 0, w, h)
    r.clear()
    for (const { el, cam } of this.panes.values()) {
      const pr = el.getBoundingClientRect()
      const pw = Math.round(pr.width)
      const ph = Math.round(pr.height)
      if (pw < 2 || ph < 2) continue
      const px = Math.round(pr.left - box.left)
      const py = Math.round(box.bottom - pr.bottom)
      cam.resize(pw / ph)
      r.setViewport(px, py, pw, ph)
      r.setScissor(px, py, pw, ph)
      r.clear()
      r.render(this.scene, cam.camera)
      this.cube.render(r, cam.camera, px, py, pw, ph)
    }
    r.setScissorTest(false)
    this.drawCalls = r.info.render.calls
    this.frames++
    this.lastFrameMs = performance.now() - t0
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    for (const u of this.unsubs) u()
    for (const i of [...this.panes.keys()]) this.detach(i)
    this.map.dispose()
    this.renderer.dispose()
  }
}
