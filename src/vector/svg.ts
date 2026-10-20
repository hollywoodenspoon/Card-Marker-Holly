/**
 * SVG export and import for the Vector Maker. Export writes one <g> per layer
 * and one <path> per item. Import reads paths and basic shapes (rect, circle,
 * ellipse, line, polyline, polygon) with their fill / stroke and transforms;
 * top-level groups become layers. Other SVG features (text, gradients, masks,
 * filters, images) are skipped.
 */
import { IDENTITY, multiply, pathData, transform, type Matrix, type SubPath } from './geometry'
import {
  newDoc,
  newId,
  newLayer,
  type VectorDoc,
  type VLayer,
  type VPath,
  type VStyle,
} from './model'
import { ellipse, roundedRect } from './shapes'
import { parsePathData } from './svgPath'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function pathEl(p: VPath): string {
  const s = p.style
  const attrs = [`d="${pathData(p.subpaths)}"`, `fill="${s.fill ?? 'none'}"`, 'fill-rule="evenodd"']
  if (s.stroke && s.strokeWidth > 0)
    attrs.push(
      `stroke="${s.stroke}"`,
      `stroke-width="${s.strokeWidth}"`,
      `stroke-linejoin="${s.lineJoin ?? 'round'}"`,
      `stroke-linecap="${s.lineCap ?? 'round'}"`,
    )
  if (s.opacity < 1) attrs.push(`opacity="${s.opacity}"`)
  return `<path id="${esc(p.id)}" data-name="${esc(p.name)}" ${attrs.join(' ')}/>`
}

/** The document as an SVG file (hidden layers and items are left out). */
export function toSvg(doc: VectorDoc, opts: { background?: string } = {}): string {
  const body = doc.layers
    .filter((l) => l.visible)
    .map((l) => {
      const items = l.items
        .filter((i) => !i.hidden)
        .map(pathEl)
        .join('')
      const op = l.opacity < 1 ? ` opacity="${l.opacity}"` : ''
      return `<g id="${esc(l.id)}" data-name="${esc(l.name)}"${op}>${items}</g>`
    })
    .join('')
  const bg = opts.background
    ? `<rect width="${doc.width}" height="${doc.height}" fill="${opts.background}"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">${bg}${body}</svg>`
}

// ---------- import ----------

function parseTransform(t: string | null): Matrix {
  let m: Matrix = IDENTITY
  if (!t) return m
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g
  let r: RegExpExecArray | null
  while ((r = re.exec(t))) {
    const v = r[2]
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    let n: Matrix = IDENTITY
    switch (r[1]) {
      case 'matrix':
        n = [v[0], v[1], v[2], v[3], v[4], v[5]]
        break
      case 'translate':
        n = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0]
        break
      case 'scale':
        n = [v[0], 0, 0, v[1] ?? v[0], 0, 0]
        break
      case 'rotate': {
        const a = ((v[0] ?? 0) * Math.PI) / 180
        const rot: Matrix = [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]
        n =
          v.length >= 3
            ? multiply(multiply([1, 0, 0, 1, v[1], v[2]], rot), [1, 0, 0, 1, -v[1], -v[2]])
            : rot
        break
      }
      case 'skewX':
        n = [1, 0, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 1, 0, 0]
        break
      case 'skewY':
        n = [1, Math.tan(((v[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0]
        break
    }
    m = multiply(m, n)
  }
  return m
}

interface Inherited {
  fill: string | null
  stroke: string | null
  strokeWidth: number
  opacity: number
}

function hex(c: string): string {
  const s = c.trim()
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s)
  if (m3) return `#${m3[1]}${m3[1]}${m3[2]}${m3[2]}${m3[3]}${m3[3]}`.toLowerCase()
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(s)
  if (rgb)
    return `#${[rgb[1], rgb[2], rgb[3]].map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0')).join('')}`
  return s.toLowerCase()
}

/** An attribute, also looking inside `style="…"`. */
function prop(el: Element, name: string): string | null {
  const style = el.getAttribute('style')
  if (style) {
    const m = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style)
    if (m) return m[1].trim()
  }
  return el.getAttribute(name)
}

function inherit(el: Element, parent: Inherited): Inherited {
  const fill = prop(el, 'fill')
  const stroke = prop(el, 'stroke')
  const sw = prop(el, 'stroke-width')
  const op = Number(prop(el, 'opacity') ?? 1) * Number(prop(el, 'fill-opacity') ?? 1)
  return {
    fill: fill === null ? parent.fill : fill === 'none' ? null : hex(fill),
    stroke: stroke === null ? parent.stroke : stroke === 'none' ? null : hex(stroke),
    strokeWidth: sw === null ? parent.strokeWidth : parseFloat(sw) || 0,
    opacity: parent.opacity * (Number.isFinite(op) ? op : 1),
  }
}

const n = (el: Element, a: string) => parseFloat(el.getAttribute(a) ?? '0') || 0

function shapeSubpaths(el: Element): SubPath[] | null {
  switch (el.tagName.toLowerCase()) {
    case 'path':
      return parsePathData(el.getAttribute('d') ?? '')
    case 'rect':
      return [
        roundedRect(
          { x: n(el, 'x'), y: n(el, 'y'), w: n(el, 'width'), h: n(el, 'height') },
          n(el, 'rx') || n(el, 'ry'),
        ),
      ]
    case 'circle':
      return [ellipse(n(el, 'cx'), n(el, 'cy'), n(el, 'r'), n(el, 'r'))]
    case 'ellipse':
      return [ellipse(n(el, 'cx'), n(el, 'cy'), n(el, 'rx'), n(el, 'ry'))]
    case 'line':
      return [
        {
          closed: false,
          anchors: [
            { x: n(el, 'x1'), y: n(el, 'y1') },
            { x: n(el, 'x2'), y: n(el, 'y2') },
          ],
        },
      ]
    case 'polyline':
    case 'polygon': {
      const v = (el.getAttribute('points') ?? '')
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number)
      const anchors = []
      for (let i = 0; i + 1 < v.length; i += 2) anchors.push({ x: v[i], y: v[i + 1] })
      return [{ closed: el.tagName.toLowerCase() === 'polygon', anchors }]
    }
  }
  return null
}

const SKIP = new Set([
  'defs',
  'clippath',
  'mask',
  'pattern',
  'symbol',
  'style',
  'title',
  'desc',
  'metadata',
  'text',
  'image',
  'filter',
  'lineargradient',
  'radialgradient',
])

/** Read an SVG file's text into a document (throws on text that isn't SVG). */
export function fromSvg(text: string): VectorDoc {
  const xml = new DOMParser().parseFromString(text, 'image/svg+xml')
  const root = xml.documentElement
  if (
    !root ||
    root.tagName.toLowerCase() !== 'svg' ||
    xml.getElementsByTagName('parsererror').length
  )
    throw new Error('This file is not an SVG.')
  const vb = (root.getAttribute('viewBox') ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number)
  const width = vb.length === 4 ? vb[2] : parseFloat(root.getAttribute('width') ?? '') || 512
  const height = vb.length === 4 ? vb[3] : parseFloat(root.getAttribute('height') ?? '') || 512
  const base: Matrix = vb.length === 4 ? [1, 0, 0, 1, -vb[0], -vb[1]] : IDENTITY
  const doc = newDoc(Math.round(width), Math.round(height))
  doc.layers = []
  const loose = newLayer('Layer 1')
  const start: Inherited = { fill: '#000000', stroke: null, strokeWidth: 1, opacity: 1 }

  const walk = (el: Element, m: Matrix, st: Inherited, into: VLayer) => {
    const tag = el.tagName.toLowerCase()
    if (SKIP.has(tag) || prop(el, 'display') === 'none') return
    const mm = multiply(m, parseTransform(el.getAttribute('transform')))
    const s = inherit(el, st)
    const subs = shapeSubpaths(el)
    if (subs) {
      if (!subs.length) return
      const style: VStyle = {
        fill: s.fill,
        stroke: s.stroke,
        strokeWidth: s.strokeWidth,
        opacity: s.opacity,
        lineJoin: 'round',
        lineCap: 'round',
      }
      into.items.push({
        id: newId(),
        name: el.getAttribute('data-name') ?? el.getAttribute('id') ?? tag,
        subpaths: transform(subs, mm),
        style,
      })
      return
    }
    for (const c of Array.from(el.children)) walk(c, mm, s, into)
  }

  for (const c of Array.from(root.children)) {
    if (c.tagName.toLowerCase() === 'g') {
      const layer = newLayer(
        c.getAttribute('data-name') ?? c.getAttribute('id') ?? `Layer ${doc.layers.length + 1}`,
      )
      // The group's own opacity becomes the layer's.
      const op = Number(c.getAttribute('opacity') ?? 1)
      layer.opacity = Number.isFinite(op) ? op : 1
      const st = inherit(c, inherit(root, start))
      const mm = multiply(base, parseTransform(c.getAttribute('transform')))
      const inner = { ...st, opacity: st.opacity / (layer.opacity || 1) }
      for (const child of Array.from(c.children)) walk(child, mm, inner, layer)
      if (layer.items.length) doc.layers.push(layer)
    } else walk(c, base, inherit(root, start), loose)
  }
  if (loose.items.length) doc.layers.unshift(loose)
  if (!doc.layers.length) doc.layers.push(newLayer('Layer 1'))
  return doc
}
