import { useEffect, useRef } from 'react'
import { type TileRef, type Tileset, tileUv } from '../model/tileset'
import { textureStore } from '../scene/textureStore'

/**
 * A tileset as a clickable grid: the image drawn crisp at a whole-number scale
 * that fits the panel, the picked tile outlined. Keyboard: arrow keys move the
 * pick, so the grid works without a mouse too.
 */
export function TilePicker({
  tileset,
  value,
  onPick,
  width = 216,
}: {
  tileset: Tileset
  value?: TileRef
  onPick: (r: TileRef) => void
  width?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const scale = Math.max(1, Math.floor(width / (tileset.cols * tileset.tileSize)))
  const cell = tileset.tileSize * scale
  const w = tileset.cols * cell
  const h = tileset.rows * cell
  const picked = value?.tileset === tileset.id ? value.index : -1

  useEffect(() => {
    let live = true
    const draw = () =>
      textureStore.canvas(tileset).then((img) => {
        const c = ref.current
        if (!live || !c) return
        const dpr = Math.min(window.devicePixelRatio, 2)
        c.width = w * dpr
        c.height = h * dpr
        const g = c.getContext('2d')!
        g.setTransform(dpr, 0, 0, dpr, 0, 0)
        g.imageSmoothingEnabled = false
        for (let i = 0; i < tileset.cols * tileset.rows; i++) {
          const uv = tileUv(tileset, i)
          const sx = Math.round(uv.u0 * img.width)
          const sy = Math.round((1 - uv.v1) * img.height)
          const dx = (i % tileset.cols) * cell
          const dy = Math.floor(i / tileset.cols) * cell
          g.drawImage(img, sx, sy, tileset.tileSize, tileset.tileSize, dx, dy, cell, cell)
        }
        g.strokeStyle = 'rgba(0,0,0,0.35)'
        g.lineWidth = 1
        for (let x = 0; x <= tileset.cols; x++) g.strokeRect(x * cell, 0, 0, h)
        for (let y = 0; y <= tileset.rows; y++) g.strokeRect(0, y * cell, w, 0)
        if (picked >= 0) {
          g.strokeStyle = '#ffd36b'
          g.lineWidth = 2
          g.strokeRect(
            (picked % tileset.cols) * cell + 1,
            Math.floor(picked / tileset.cols) * cell + 1,
            cell - 2,
            cell - 2,
          )
        }
      })
    void draw()
    const off = textureStore.subscribe(() => void draw())
    return () => {
      live = false
      off()
    }
  }, [tileset, picked, w, h, cell])

  const pickAt = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const col = Math.floor((e.clientX - r.left) / cell)
    const row = Math.floor((e.clientY - r.top) / cell)
    if (col < 0 || row < 0 || col >= tileset.cols || row >= tileset.rows) return
    onPick({ tileset: tileset.id, index: row * tileset.cols + col })
  }
  const onKey = (e: React.KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -tileset.cols, ArrowDown: tileset.cols }[
      e.key
    ]
    if (step === undefined) return
    e.preventDefault()
    const n = tileset.cols * tileset.rows
    const next = Math.max(0, Math.min(n - 1, (picked < 0 ? 0 : picked) + step))
    onPick({ tileset: tileset.id, index: next })
  }

  return (
    <div className="max-h-64 overflow-auto rounded-md border bg-black/20">
      <canvas
        ref={ref}
        role="grid"
        aria-label={`Tiles in ${tileset.name}`}
        tabIndex={0}
        style={{ width: w, height: h, imageRendering: 'pixelated' }}
        className="block cursor-crosshair outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onPointerDown={pickAt}
        onKeyDown={onKey}
      />
    </div>
  )
}

/** One tile drawn small, e.g. in the inspector or a type's face list. */
export function TileSwatch({
  tileset,
  tile,
  size = 28,
}: {
  tileset?: Tileset
  tile: TileRef
  size?: number
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!tileset) return
    let live = true
    void textureStore.canvas(tileset).then((img) => {
      const c = ref.current
      if (!live || !c) return
      c.width = size
      c.height = size
      const g = c.getContext('2d')!
      g.imageSmoothingEnabled = false
      const uv = tileUv(tileset, tile.index)
      g.drawImage(
        img,
        Math.round(uv.u0 * img.width),
        Math.round((1 - uv.v1) * img.height),
        tileset.tileSize,
        tileset.tileSize,
        0,
        0,
        size,
        size,
      )
    })
    return () => {
      live = false
    }
  }, [tileset, tile.index, size])
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ width: size, height: size, imageRendering: 'pixelated' }}
      className="shrink-0 rounded-sm border border-black/30"
    />
  )
}
