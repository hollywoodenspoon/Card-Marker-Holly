/** Commands on the Vector Maker document (each one undo step). */
import {
  bounds,
  boxToBox,
  reverseSub,
  transform,
  translateM,
  type Box,
  type Matrix,
  type SubPath,
} from './geometry'
import { allItems, findItem, newId, newLayer, newPath, type VPath, type VStyle } from './model'
import { buildShape, shapeById } from './shapes'
import { useVector, vcommit } from './store'

const sel = () => useVector.getState().selection

/** Selected paths in drawing order (bottom first). */
export function selectedItems(): VPath[] {
  const ids = new Set(sel())
  return allItems(useVector.getState().doc)
    .filter((e) => ids.has(e.item.id))
    .map((e) => e.item)
}

export function selectionBounds(items: VPath[] = selectedItems()): Box | null {
  if (!items.length) return null
  const bs = items.map((i) => bounds(i.subpaths))
  const x0 = Math.min(...bs.map((b) => b.x))
  const y0 = Math.min(...bs.map((b) => b.y))
  const x1 = Math.max(...bs.map((b) => b.x + b.w))
  const y1 = Math.max(...bs.map((b) => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Apply a matrix to the selected paths. Moves keep shape settings; other changes drop them. */
export function transformSelection(m: Matrix, coalesce?: string, ids = sel()) {
  const move = m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1
  vcommit((d) => {
    for (const id of ids) {
      const f = findItem(d, id)
      if (!f || f.item.locked) continue
      f.item.subpaths = transform(f.item.subpaths, m)
      if (f.item.shape && move) {
        f.item.shape.box.x += m[4]
        f.item.shape.box.y += m[5]
      } else delete f.item.shape
    }
  }, coalesce)
}

/** Resize / move the selection to a new bounding box (X, Y, W, H fields). */
export function setSelectionBox(next: Partial<Box>) {
  const b = selectionBounds()
  if (!b) return
  const to = { ...b, ...next }
  if (to.w <= 0 || to.h <= 0) return
  transformSelection(boxToBox(b, to), 'box')
}

export function setStyle(patch: Partial<VStyle>, coalesce?: string) {
  const ids = sel()
  vcommit((d) => {
    for (const id of ids) {
      const f = findItem(d, id)
      if (f) Object.assign(f.item.style, patch)
    }
  }, coalesce)
  // New shapes take the last style used.
  useVector.setState((s) => ({ shapeStyle: { ...s.shapeStyle, ...patch } }))
}

export function setShapeParam(id: string, key: string, value: number) {
  vcommit((d) => {
    const f = findItem(d, id)
    const info = f?.item.shape
    if (!f || !info) return
    info.params[key] = value
    f.item.subpaths = buildShape(info.id, info.box, info.params)
  }, `param:${id}:${key}`)
}

export function deleteSelection() {
  const ids = new Set(sel())
  if (!ids.size) return
  vcommit((d) => {
    for (const l of d.layers) l.items = l.items.filter((i) => !ids.has(i.id) || i.locked)
  })
  useVector.setState({ selection: [], anchors: [] })
}

export function duplicateSelection() {
  const items = selectedItems()
  if (!items.length) return
  const fresh: string[] = []
  vcommit((d) => {
    for (const it of items) {
      const f = findItem(d, it.id)
      if (!f) continue
      const copy: VPath = structuredClone(it)
      copy.id = newId()
      copy.name = `${it.name} copy`
      copy.subpaths = transform(copy.subpaths, translateM(10, 10))
      if (copy.shape) {
        copy.shape.box.x += 10
        copy.shape.box.y += 10
      }
      f.layer.items.splice(f.index + 1, 0, copy)
      fresh.push(copy.id)
    }
  })
  useVector.setState({ selection: fresh, anchors: [] })
}

export type Arrange = 'front' | 'forward' | 'backward' | 'back'

export function arrange(how: Arrange) {
  const ids = new Set(sel())
  vcommit((d) => {
    for (const l of d.layers) {
      const picked = l.items.filter((i) => ids.has(i.id))
      if (!picked.length) continue
      const rest = l.items.filter((i) => !ids.has(i.id))
      if (how === 'front') l.items = [...rest, ...picked]
      else if (how === 'back') l.items = [...picked, ...rest]
      else {
        const items = [...l.items]
        const order = how === 'forward' ? [...items.keys()].reverse() : [...items.keys()]
        for (const i of order) {
          if (!ids.has(items[i].id)) continue
          const j = how === 'forward' ? i + 1 : i - 1
          if (j < 0 || j >= items.length || ids.has(items[j].id)) continue
          ;[items[i], items[j]] = [items[j], items[i]]
        }
        l.items = items
      }
    }
  })
}

export type Align = 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'

/** Align the selected paths to each other, or to the artboard when one is selected. */
export function align(how: Align) {
  const items = selectedItems()
  if (!items.length) return
  const { doc } = useVector.getState()
  const ref =
    items.length === 1 ? { x: 0, y: 0, w: doc.width, h: doc.height } : selectionBounds(items)!
  vcommit((d) => {
    for (const it of items) {
      const f = findItem(d, it.id)
      if (!f || f.item.locked) continue
      const b = bounds(it.subpaths)
      let dx = 0
      let dy = 0
      if (how === 'left') dx = ref.x - b.x
      if (how === 'hcenter') dx = ref.x + ref.w / 2 - (b.x + b.w / 2)
      if (how === 'right') dx = ref.x + ref.w - (b.x + b.w)
      if (how === 'top') dy = ref.y - b.y
      if (how === 'vcenter') dy = ref.y + ref.h / 2 - (b.y + b.h / 2)
      if (how === 'bottom') dy = ref.y + ref.h - (b.y + b.h)
      f.item.subpaths = transform(f.item.subpaths, translateM(dx, dy))
      if (f.item.shape) {
        f.item.shape.box.x += dx
        f.item.shape.box.y += dy
      }
    }
  })
}

export function reverseSelection() {
  const ids = sel()
  vcommit((d) => {
    for (const id of ids) {
      const f = findItem(d, id)
      if (f) f.item.subpaths = f.item.subpaths.map(reverseSub)
    }
  })
}

/** Compound path: the selected paths become one (holes where they overlap, even-odd). */
export function makeCompound() {
  const items = selectedItems()
  if (items.length < 2) return
  const top = items[items.length - 1]
  const id = newId()
  vcommit((d) => {
    const first = findItem(d, items[0].id)!
    const merged: VPath = {
      ...structuredClone(top),
      id,
      name: 'Compound path',
      subpaths: items.flatMap((i) => i.subpaths),
    }
    delete merged.shape
    const ids = new Set(items.map((i) => i.id))
    const at = first.index
    first.layer.items.splice(at, 0, merged)
    for (const l of d.layers) l.items = l.items.filter((i) => i.id === id || !ids.has(i.id))
  })
  useVector.setState({ selection: [id], anchors: [] })
}

/** Release compound paths: each subpath becomes its own path. */
export function releaseCompound() {
  const items = selectedItems().filter((i) => i.subpaths.length > 1)
  if (!items.length) return
  const fresh: string[] = []
  vcommit((d) => {
    for (const it of items) {
      const f = findItem(d, it.id)
      if (!f) continue
      const parts = it.subpaths.map((s, k) => {
        const p = newPath(`${it.name} ${k + 1}`, [s], it.style)
        fresh.push(p.id)
        return p
      })
      f.layer.items.splice(f.index, 1, ...parts)
    }
  })
  useVector.setState({ selection: fresh, anchors: [] })
}

/** Pathfinder on the selection (paper.js is loaded with the Vector Maker). */
export async function pathfinder(op: import('./booleans').BooleanOp) {
  const items = selectedItems()
  if (items.length < 2) return
  const { runBoolean } = await import('./booleans')
  const result = runBoolean(op, items)
  const ids = new Set(items.map((i) => i.id))
  const fresh: string[] = []
  vcommit((d) => {
    const first = findItem(d, items[0].id)!
    const layer = first.layer
    const at = first.index
    const made = (result ?? []).map((r) => {
      const p = newPath(
        op === 'divide' ? `${r.from.name} piece` : r.from.name,
        r.subpaths,
        r.from.style,
      )
      fresh.push(p.id)
      return p
    })
    for (const l of d.layers) l.items = l.items.filter((i) => !ids.has(i.id))
    layer.items.splice(Math.min(at, layer.items.length), 0, ...made)
  })
  useVector.setState({ selection: fresh, anchors: [] })
}

// ---------- layers ----------

export function addLayer() {
  const { doc } = useVector.getState()
  const layer = newLayer(`Layer ${doc.layers.length + 1}`)
  vcommit((d) => void d.layers.push(layer))
  useVector.setState({ activeLayerId: layer.id })
}

export function deleteLayer(id: string) {
  const { doc } = useVector.getState()
  if (doc.layers.length <= 1) return
  vcommit((d) => {
    d.layers = d.layers.filter((l) => l.id !== id)
  })
  const left = useVector.getState().doc.layers
  useVector.setState((s) => ({
    activeLayerId: left[left.length - 1].id,
    selection: s.selection.filter((sid) => left.some((l) => l.items.some((i) => i.id === sid))),
  }))
}

export function updateLayer(
  id: string,
  patch: Partial<{ name: string; visible: boolean; locked: boolean; opacity: number }>,
  coalesce?: string,
) {
  vcommit((d) => {
    const l = d.layers.find((x) => x.id === id)
    if (l) Object.assign(l, patch)
  }, coalesce)
}

/** Move a layer in the list (indexes in drawing order). */
export function moveLayer(from: number, to: number) {
  vcommit((d) => {
    const [l] = d.layers.splice(from, 1)
    d.layers.splice(Math.max(0, Math.min(to, d.layers.length)), 0, l)
  })
}

export function updateItem(id: string, patch: Partial<Pick<VPath, 'name' | 'hidden' | 'locked'>>) {
  vcommit((d) => {
    const f = findItem(d, id)
    if (f) Object.assign(f.item, patch)
  })
}

/** Move the selected paths to the top of another layer. */
export function moveToLayer(layerId: string) {
  const items = selectedItems()
  const ids = new Set(items.map((i) => i.id))
  vcommit((d) => {
    const target = d.layers.find((l) => l.id === layerId)
    if (!target) return
    for (const l of d.layers) l.items = l.items.filter((i) => !ids.has(i.id))
    target.items.push(...structuredClone(items))
  })
}

export function setArtboard(width: number, height: number) {
  vcommit((d) => {
    d.width = Math.max(1, Math.round(width))
    d.height = Math.max(1, Math.round(height))
  }, 'artboard')
}

/** Shrink (or grow) the artboard to the artwork's bounds plus a margin, moving everything to fit. */
export function fitArtboardToArt(margin = 0) {
  const { doc } = useVector.getState()
  const visible = allItems(doc)
    .filter((e) => e.layer.visible && !e.item.hidden)
    .map((e) => e.item)
  const b = selectionBounds(visible)
  if (!b || b.w <= 0 || b.h <= 0) return
  // Strokes reach half their width past the outline.
  const pad =
    margin + Math.max(0, ...visible.map((i) => (i.style.stroke ? i.style.strokeWidth / 2 : 0)))
  const dx = pad - b.x
  const dy = pad - b.y
  vcommit((d) => {
    d.width = Math.max(1, Math.ceil(b.w + 2 * pad))
    d.height = Math.max(1, Math.ceil(b.h + 2 * pad))
    for (const l of d.layers)
      for (const it of l.items) {
        it.subpaths = transform(it.subpaths as SubPath[], translateM(dx, dy))
        if (it.shape) {
          it.shape.box.x += dx
          it.shape.box.y += dy
        }
      }
  })
}

/** Add a preset shape in a box, on the active layer. */
export function addShape(shapeId: string, box: Box) {
  const def = shapeById(shapeId)
  if (!def) return
  const s = useVector.getState()
  const params = Object.fromEntries((def.params ?? []).map((p) => [p.key, p.value]))
  const style: VStyle = def.open
    ? {
        ...s.shapeStyle,
        fill: null,
        stroke: s.shapeStyle.stroke ?? '#1f1f24',
        strokeWidth: Math.max(1, s.shapeStyle.strokeWidth),
      }
    : s.shapeStyle
  const p = newPath(def.label, buildShape(shapeId, box, params), style)
  p.shape = { id: shapeId, params, box }
  vcommit((d) => {
    const layer = d.layers.find((l) => l.id === s.activeLayerId) ?? d.layers[d.layers.length - 1]
    layer.items.push(p)
  })
  useVector.setState({ selection: [p.id], anchors: [] })
}
