/**
 * Pathfinder: unite, minus front, intersect, exclude and divide, using
 * paper.js for the curve maths only (nothing is drawn by paper). Browser only:
 * paper needs a canvas. Items come in drawing order (bottom first).
 */
import paper from 'paper/dist/paper-core'
import { pathData, type SubPath } from './geometry'
import type { VPath } from './model'
import { parsePathData } from './svgPath'

export type BooleanOp = 'unite' | 'minus' | 'intersect' | 'exclude' | 'divide'

let scope: paper.PaperScope | null = null
function ensure() {
  if (!scope) {
    scope = new paper.PaperScope()
    scope.setup(new scope.Size(1, 1))
  }
  scope.activate()
  return scope
}

const toItem = (subs: SubPath[]): paper.PathItem => {
  const s = ensure()
  const item = new s.CompoundPath({ pathData: pathData(subs), insert: false })
  item.fillRule = 'evenodd'
  return item
}

const toSubs = (item: paper.PathItem): SubPath[] =>
  item.isEmpty() ? [] : parsePathData(item.pathData)

const opts = { insert: false }

/** The result paths (with the style each keeps), or null when nothing is left. */
export function runBoolean(
  op: BooleanOp,
  items: VPath[],
): { subpaths: SubPath[]; from: VPath }[] | null {
  if (items.length < 2) return null
  const shapes = items.map((i) => toItem(i.subpaths))
  const top = items[items.length - 1]
  const bottom = items[0]
  let out: { subpaths: SubPath[]; from: VPath }[] = []
  switch (op) {
    case 'unite': {
      const r = shapes.reduce((a, b) => a.unite(b, opts))
      out = [{ subpaths: toSubs(r), from: top }]
      break
    }
    case 'minus': {
      const cut = shapes.slice(1).reduce((a, b) => a.unite(b, opts))
      out = [{ subpaths: toSubs(shapes[0].subtract(cut, opts)), from: bottom }]
      break
    }
    case 'intersect': {
      const r = shapes.reduce((a, b) => a.intersect(b, opts))
      out = [{ subpaths: toSubs(r), from: top }]
      break
    }
    case 'exclude': {
      const r = shapes.reduce((a, b) => a.exclude(b, opts))
      out = [{ subpaths: toSubs(r), from: top }]
      break
    }
    case 'divide': {
      // Split everything into the pieces their outlines make; each piece keeps
      // the style of the topmost shape covering it.
      let pieces: { item: paper.PathItem; from: VPath }[] = []
      shapes.forEach((shape, k) => {
        let rest = shape
        const next: typeof pieces = []
        for (const p of pieces) {
          const inter = p.item.intersect(shape, opts)
          const outside = p.item.subtract(shape, opts)
          if (!inter.isEmpty()) next.push({ item: inter, from: items[k] })
          if (!outside.isEmpty()) next.push({ item: outside, from: p.from })
          rest = rest.subtract(p.item, opts)
        }
        if (!rest.isEmpty()) next.push({ item: rest, from: items[k] })
        pieces = next
      })
      // Split compound results into separate pieces (each closed outline).
      out = pieces.flatMap(({ item, from }) => {
        const subs = toSubs(item)
        return subs.map((s) => ({ subpaths: [s], from }))
      })
      break
    }
  }
  out = out.filter((o) => o.subpaths.length)
  return out.length ? out : null
}
