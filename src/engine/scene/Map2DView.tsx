/**
 * The flat 2D view of the same map: each tile's top tile drawn from above, shaded
 * by height, with slopes, water, blocked tiles and overhangs marked. It edits
 * with the same tools as the 3D panes, and needs no WebGL, so it is also the
 * fallback on machines where 3D is too slow or missing.
 */
import { useEffect, useRef } from 'react'
import { cornerHeights, kindOf, parseCellKey, tileAt, topRef, type MapDoc } from '../model/map'
import { tileUv, type Tileset } from '../model/tileset'
import { useEngine } from '../store/engineStore'
import { applyTool, newStroke, type Stroke } from '../tools/apply'
import { textureStore } from './textureStore'

interface View {
  cell: number
  ox: number
  oy: number
}

export function Map2DView({ onActive }: { onActive?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const images = new Map<string, HTMLCanvasElement>()
    let view: View | null = null
    let hover: { x: number; z: number } | null = null
    let dirty = true
    let raf = 0
    const invalidate = () => (dirty = true)

    const loadImages = (map: MapDoc) =>
      map.tilesets.forEach((ts) =>
        textureStore.canvas(ts).then((c) => {
          images.set(ts.id, c)
          invalidate()
        }),
      )

    const fit = (map: MapDoc) => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cell = Math.max(4, Math.floor(Math.min(w / map.size.x, h / map.size.z) * 0.9))
      view = { cell, ox: (w - cell * map.size.x) / 2, oy: (h - cell * map.size.z) / 2 }
    }

    const draw = () => {
      const map = useEngine.getState().map
      const sel = useEngine.getState().selection
      const dpr = Math.min(window.devicePixelRatio, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
      }
      if (!view) fit(map)
      const v = view!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('--canvas').trim() || '#1c1c1f'
      ctx.fillRect(0, 0, w, h)
      let maxH = 1
      for (const t of map.tiles) if (t && t.h > maxH) maxH = t.h
      const sets = new Map<string, Tileset>(map.tilesets.map((t) => [t.id, t]))
      for (let z = 0; z < map.size.z; z++)
        for (let x = 0; x < map.size.x; x++) {
          const t = tileAt(map, x, z)
          const px = v.ox + x * v.cell
          const py = v.oy + z * v.cell
          if (!t) {
            ctx.fillStyle = 'rgba(0,0,0,0.35)'
            ctx.fillRect(px, py, v.cell, v.cell)
            continue
          }
          const r = topRef(map, t)
          const ts = sets.get(r.tileset)
          const img = ts && images.get(ts.id)
          if (ts && img) {
            const uv = tileUv(ts, r.index)
            const sx = Math.round(uv.u0 * img.width)
            const sy = Math.round((1 - uv.v1) * img.height)
            ctx.drawImage(img, sx, sy, ts.tileSize, ts.tileSize, px, py, v.cell + 0.5, v.cell + 0.5)
          } else {
            ctx.fillStyle = '#777'
            ctx.fillRect(px, py, v.cell, v.cell)
          }
          // Lower ground reads darker, like a height map.
          const shade = 0.38 * (1 - t.h / maxH)
          if (shade > 0.01) {
            ctx.fillStyle = `rgba(0,0,0,${shade})`
            ctx.fillRect(px, py, v.cell, v.cell)
          }
          const kind = kindOf(map, t)
          if (kind === 'blocked') {
            ctx.strokeStyle = 'rgba(230,70,60,0.85)'
            ctx.lineWidth = Math.max(1, v.cell / 14)
            ctx.beginPath()
            ctx.moveTo(px + 3, py + 3)
            ctx.lineTo(px + v.cell - 3, py + v.cell - 3)
            ctx.moveTo(px + v.cell - 3, py + 3)
            ctx.lineTo(px + 3, py + v.cell - 3)
            ctx.stroke()
          }
          if (t.slope) drawSlope(ctx, px, py, v.cell, t.slope.dir)
          if (v.cell >= 26) {
            const [a, b, c, d] = cornerHeights(t)
            const label = String(Math.max(a, b, c, d) / 2)
            ctx.font = `${Math.round(v.cell / 3.2)}px Inter, system-ui, sans-serif`
            ctx.fillStyle = 'rgba(255,255,255,0.85)'
            ctx.strokeStyle = 'rgba(0,0,0,0.6)'
            ctx.lineWidth = 2
            ctx.strokeText(label, px + 3, py + v.cell - 4)
            ctx.fillText(label, px + 3, py + v.cell - 4)
          }
        }
      // Overhangs: a dashed square over the tiles they span.
      ctx.setLineDash([4, 3])
      ctx.strokeStyle = 'rgba(255,214,140,0.9)'
      ctx.lineWidth = 1.5
      for (const key of Object.keys(map.overhangs)) {
        const c = parseCellKey(key)
        ctx.strokeRect(v.ox + c.x * v.cell + 2, v.oy + c.z * v.cell + 2, v.cell - 4, v.cell - 4)
      }
      ctx.setLineDash([])
      // Grid.
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 0; x <= map.size.x; x++) {
        ctx.moveTo(v.ox + x * v.cell, v.oy)
        ctx.lineTo(v.ox + x * v.cell, v.oy + map.size.z * v.cell)
      }
      for (let z = 0; z <= map.size.z; z++) {
        ctx.moveTo(v.ox, v.oy + z * v.cell)
        ctx.lineTo(v.ox + map.size.x * v.cell, v.oy + z * v.cell)
      }
      ctx.stroke()
      const box = (x: number, z: number, color: string) => {
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(v.ox + x * v.cell + 1, v.oy + z * v.cell + 1, v.cell - 2, v.cell - 2)
      }
      if (sel) box(sel.x, sel.z, '#5fd0ff')
      if (hover) box(hover.x, hover.z, '#ffd36b')
    }

    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (dirty) {
        dirty = false
        draw()
      }
    }
    loop()

    const cellAt = (e: PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect()
      const v = view!
      return {
        x: Math.floor((e.clientX - r.left - v.ox) / v.cell),
        z: Math.floor((e.clientY - r.top - v.oy) / v.cell),
      }
    }
    const inMap = (c: { x: number; z: number }) => {
      const m = useEngine.getState().map
      return c.x >= 0 && c.z >= 0 && c.x < m.size.x && c.z < m.size.z
    }

    let stroke: Stroke | null = null
    let pan: { x: number; y: number } | null = null
    const onDown = (e: PointerEvent) => {
      onActive?.()
      canvas.setPointerCapture(e.pointerId)
      if (e.button === 1 || e.button === 2) {
        pan = { x: e.clientX, y: e.clientY }
        return
      }
      if (e.button !== 0) return
      const c = cellAt(e)
      if (!inMap(c)) return
      stroke = newStroke()
      const ground = !tileAt(useEngine.getState().map, c.x, c.z)
      applyTool(
        { x: c.x, z: c.z, face: 'top', ground },
        { alt: e.altKey, shift: e.shiftKey },
        stroke,
      )
    }
    const onMove = (e: PointerEvent) => {
      if (pan && view) {
        view.ox += e.clientX - pan.x
        view.oy += e.clientY - pan.y
        pan = { x: e.clientX, y: e.clientY }
        invalidate()
        return
      }
      const c = cellAt(e)
      hover = inMap(c) ? c : null
      if (stroke && hover) {
        const ground = !tileAt(useEngine.getState().map, c.x, c.z)
        applyTool(
          { x: c.x, z: c.z, face: 'top', ground },
          { alt: e.altKey, shift: e.shiftKey },
          stroke,
        )
      }
      invalidate()
    }
    const onUp = () => {
      pan = null
      if (stroke) useEngine.getState().endStroke()
      stroke = null
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (!view) return
      const r = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      const k = Math.exp(-e.deltaY * 0.0015)
      const cell = Math.max(4, Math.min(160, view.cell * k))
      const f = cell / view.cell
      view = { cell, ox: mx - (mx - view.ox) * f, oy: my - (my - view.oy) * f }
      invalidate()
    }
    const onLeave = () => {
      hover = null
      invalidate()
    }
    const noMenu = (e: Event) => e.preventDefault()
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('contextmenu', noMenu)
    const ro = new ResizeObserver(invalidate)
    ro.observe(canvas)
    const unTex = textureStore.subscribe(invalidate)
    loadImages(useEngine.getState().map)
    const unsub = useEngine.subscribe((s, prev) => {
      if (s.map !== prev.map) {
        if (s.map.id !== prev.map.id) view = null
        if (s.map.tilesets !== prev.map.tilesets) loadImages(s.map)
        invalidate()
      }
      if (s.selection !== prev.selection) invalidate()
    })
    return () => {
      cancelAnimationFrame(raf)
      unsub()
      unTex()
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('contextmenu', noMenu)
    }
  }, [onActive])

  return <canvas ref={ref} className="block h-full w-full touch-none" aria-label="2D map view" />
}

/** A small arrow pointing up the slope. */
function drawSlope(ctx: CanvasRenderingContext2D, px: number, py: number, s: number, dir: string) {
  const cx = px + s / 2
  const cy = py + s / 2
  const r = s * 0.28
  const angle = { n: -Math.PI / 2, e: 0, s: Math.PI / 2, w: Math.PI }[dir] ?? 0
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(-r * 0.6, -r * 0.6)
  ctx.lineTo(-r * 0.6, r * 0.6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
