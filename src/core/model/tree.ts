import { newId } from './ids'
import type { Element, GroupElement } from './types'

/** Depth-first, bottom-to-top. `parents` lists ancestors from outermost. */
export function walk(
  els: Element[],
  fn: (el: Element, parents: GroupElement[]) => void,
  parents: GroupElement[] = [],
) {
  for (const el of els) {
    fn(el, parents)
    if (el.type === 'group') walk(el.children, fn, [...parents, el])
  }
}

export function flatten(els: Element[]): Element[] {
  const out: Element[] = []
  walk(els, (e) => out.push(e))
  return out
}

export function findElement(els: Element[], id: string): Element | undefined {
  for (const el of els) {
    if (el.id === id) return el
    if (el.type === 'group') {
      const f = findElement(el.children, id)
      if (f) return f
    }
  }
  return undefined
}

export function findParent(els: Element[], id: string): GroupElement | null | undefined {
  for (const el of els) {
    if (el.id === id) return null
    if (el.type === 'group') {
      if (el.children.some((c) => c.id === id)) return el
      const f = findParent(el.children, id)
      if (f !== undefined) return f
    }
  }
  return undefined
}

/** The sibling list containing `id`, or undefined. Mutates nothing. */
export function siblingsOf(els: Element[], id: string): Element[] | undefined {
  if (els.some((e) => e.id === id)) return els
  for (const el of els) {
    if (el.type === 'group') {
      const s = siblingsOf(el.children, id)
      if (s) return s
    }
  }
  return undefined
}

/** Remove elements by id anywhere in the tree (in place on an immer draft). */
export function removeElements(els: Element[], ids: Set<string>): Element[] {
  for (let i = els.length - 1; i >= 0; i--) {
    const el = els[i]
    if (ids.has(el.id)) els.splice(i, 1)
    else if (el.type === 'group') removeElements(el.children, ids)
  }
  return els
}

/** Deep copy with fresh ids. */
export function cloneWithNewIds<T extends Element>(el: T): T {
  const copy = structuredClone(el) as T
  const reid = (e: Element) => {
    e.id = newId()
    if (e.type === 'group') e.children.forEach(reid)
  }
  reid(copy)
  return copy
}

export interface Bounds {
  xMm: number
  yMm: number
  wMm: number
  hMm: number
}

/** Axis-aligned bounds of an element, accounting for rotation (around top-left). */
export function elementBounds(el: Element): Bounds | null {
  if (el.type === 'group') return unionBounds(el.children.map(elementBounds))
  const r = (el.rotation * Math.PI) / 180
  const cos = Math.cos(r)
  const sin = Math.sin(r)
  const pts = [
    [0, 0],
    [el.wMm, 0],
    [el.wMm, el.hMm],
    [0, el.hMm],
  ].map(([x, y]) => [el.xMm + x * cos - y * sin, el.yMm + x * sin + y * cos])
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  return { xMm: x0, yMm: y0, wMm: Math.max(...xs) - x0, hMm: Math.max(...ys) - y0 }
}

export function unionBounds(list: (Bounds | null)[]): Bounds | null {
  const bs = list.filter((b): b is Bounds => !!b)
  if (!bs.length) return null
  const x0 = Math.min(...bs.map((b) => b.xMm))
  const y0 = Math.min(...bs.map((b) => b.yMm))
  const x1 = Math.max(...bs.map((b) => b.xMm + b.wMm))
  const y1 = Math.max(...bs.map((b) => b.yMm + b.hMm))
  return { xMm: x0, yMm: y0, wMm: x1 - x0, hMm: y1 - y0 }
}

/** Translate an element (and group children) by dx/dy mm, in place. */
export function translateElement(el: Element, dx: number, dy: number) {
  if (el.type === 'group') el.children.forEach((c) => translateElement(c, dx, dy))
  else {
    el.xMm += dx
    el.yMm += dy
  }
}

export function fieldNames(els: Element[]): string[] {
  const names: string[] = []
  walk(els, (e) => {
    if ('fieldName' in e && !names.includes(e.fieldName)) names.push(e.fieldName)
  })
  return names
}

/** Pick a name not used yet, e.g. "Text 2". */
export function uniqueName(base: string, taken: Iterable<string>): string {
  const set = new Set(taken)
  if (!set.has(base)) return base
  let i = 2
  while (set.has(`${base} ${i}`)) i++
  return `${base} ${i}`
}
