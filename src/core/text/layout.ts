import type { RichText, TextAlign, TextStyle, VAlign } from '../model/types'
import { ptToMm } from '../units/units'
import type { Measurer } from './measure'
import { resolveStyle } from './richtext'

export interface Fragment {
  /** For symbols, the original `{name}` token. */
  text: string
  /** Inline symbol: draw this asset instead of the text. */
  symbolAssetId?: string
  style: TextStyle
  /** Font size actually used, mm (after auto-shrink). */
  sizeMm: number
  /** x offset from the box's content left edge, mm. */
  x: number
  width: number
}

export interface Line {
  /** Top of the line box from the content top, mm. */
  y: number
  height: number
  /** Baseline from the content top, mm. */
  baseline: number
  width: number
  fragments: Fragment[]
}

export interface TextLayout {
  lines: Line[]
  /** Height of all lines, mm. */
  height: number
  /** Font scale applied by auto-shrink (1 = none). */
  scale: number
  /** Text still doesn't fit (even at minimum size). */
  overflow: boolean
  /** Vertical offset to apply for vAlign, mm. */
  offsetY: number
}

export interface LayoutInput {
  text: RichText
  baseStyle: TextStyle
  align: TextAlign
  lineHeight: number
  vAlign: VAlign
  /** Content box (after padding), mm. */
  width: number
  height: number
  autoShrink?: { enabled: boolean; minPt: number }
  /** Inline symbols: `{name}` → an asset drawn 1 em high. Unknown names stay text. */
  symbols?: SymbolLookup
}

export type SymbolLookup = (name: string) => { assetId: string; aspect: number } | undefined

/** Symbols sit 1 em high with their bottom slightly below the baseline. */
export const SYMBOL_TOP_EM = 0.82

interface Piece {
  text: string
  style: TextStyle
  space: boolean
  symbol?: { assetId: string; aspect: number }
}

const SYMBOL_RE = /(\{[A-Za-z0-9_-]+\})/

/** Split runs into words, whitespace and inline symbols, keeping styles. */
function pieces(runs: { text: string; style: TextStyle }[], symbols?: SymbolLookup): Piece[] {
  const out: Piece[] = []
  for (const r of runs) {
    for (const part of r.text.split(SYMBOL_RE)) {
      if (!part) continue
      const sym = SYMBOL_RE.test(part) ? symbols?.(part.slice(1, -1)) : undefined
      if (sym) {
        out.push({ text: part, style: r.style, space: false, symbol: sym })
        continue
      }
      for (const m of part.matchAll(/\s+|[^\s]+/g))
        out.push({ text: m[0], style: r.style, space: /^\s+$/.test(m[0]) })
    }
  }
  return out
}

/** Consecutive non-space pieces form one word (they never break apart). */
function words(ps: Piece[]): Piece[][] {
  const out: Piece[][] = []
  for (const p of ps) {
    const last = out[out.length - 1]
    if (!p.space && last && !last[0].space) last.push(p)
    else out.push([p])
  }
  return out
}

function layoutOnce(input: LayoutInput, m: Measurer, scale: number) {
  const sizeOf = (s: TextStyle) => ptToMm(s.sizePt) * scale
  const measure = (text: string, s: TextStyle) => {
    const size = sizeOf(s)
    return m.width(text, s, size) + s.letterSpacingEm * size * [...text].length
  }
  const pieceWidth = (p: Piece) =>
    p.symbol ? sizeOf(p.style) * p.symbol.aspect : measure(p.text, p.style)
  const lines: Line[] = []
  let y = 0
  let tooWide = false

  for (const para of input.text.paragraphs) {
    const align = para.align ?? input.align
    const lh = para.lineHeight ?? input.lineHeight
    const runs = para.runs.map((r) => ({
      text: r.text,
      style: resolveStyle(input.baseStyle, r.style),
    }))
    const ws = words(pieces(runs, input.symbols))
    // Empty paragraph still takes one line at the base (or first run) size.
    const emptyStyle = runs[0]?.style ?? input.baseStyle

    type Frag = Omit<Fragment, 'x'>
    let current: Frag[] = []
    let currentW = 0
    const paraLines: Frag[][] = []

    const pushLine = () => {
      // drop trailing whitespace
      while (current.length && /^\s+$/.test(current[current.length - 1].text)) current.pop()
      paraLines.push(current)
      current = []
      currentW = 0
    }

    const frag = (p: Piece): Frag => ({
      text: p.text,
      style: p.style,
      sizeMm: sizeOf(p.style),
      width: pieceWidth(p),
      ...(p.symbol ? { symbolAssetId: p.symbol.assetId } : {}),
    })

    for (const word of ws) {
      if (word[0].space) {
        if (!current.length) continue // no leading spaces after a wrap
        const f = frag(word[0])
        current.push(f)
        currentW += f.width
        continue
      }
      const frags = word.map(frag)
      const w = frags.reduce((a, f) => a + f.width, 0)
      if (currentW + w > input.width + 1e-6 && current.length) pushLine()
      if (w > input.width + 1e-6 && word.length === 1 && !word[0].symbol) {
        // A single word wider than the box: break it by characters.
        const p = word[0]
        const size = sizeOf(p.style)
        tooWide = true
        let chunk = ''
        for (const ch of p.text) {
          const cw = measure(chunk + ch, p.style)
          if (currentW + cw > input.width + 1e-6 && (chunk || current.length)) {
            if (chunk)
              current.push({
                text: chunk,
                style: p.style,
                sizeMm: size,
                width: measure(chunk, p.style),
              })
            pushLine()
            chunk = ch
          } else chunk += ch
        }
        if (chunk) {
          const cw = measure(chunk, p.style)
          current.push({ text: chunk, style: p.style, sizeMm: size, width: cw })
          currentW += cw
        }
        continue
      }
      if (w > input.width + 1e-6) tooWide = true
      current.push(...frags)
      currentW += w
    }
    pushLine()

    paraLines.forEach((frags, li) => {
      const sizes = frags.length ? frags.map((f) => f.sizeMm) : [sizeOf(emptyStyle)]
      const styles = frags.length ? frags.map((f) => f.style) : [emptyStyle]
      const maxSize = Math.max(...sizes)
      const height = maxSize * lh
      // Baseline: half-leading model, using the tallest font's metrics.
      let asc = 0
      let desc = 0
      styles.forEach((s, i) => {
        const mt = m.metrics(s, sizes[i])
        asc = Math.max(asc, mt.ascent)
        desc = Math.max(desc, mt.descent)
      })
      const baseline = y + (height - (asc + desc)) / 2 + asc
      const width = frags.reduce((a, f) => a + f.width, 0)
      const isLast = li === paraLines.length - 1
      let x =
        align === 'center' ? (input.width - width) / 2 : align === 'right' ? input.width - width : 0
      let extraPerSpace = 0
      if (align === 'justify' && !isLast) {
        const spaces = frags.filter((f) => /^\s+$/.test(f.text)).length
        if (spaces) extraPerSpace = (input.width - width) / spaces
      }
      const placed: Fragment[] = frags.map((f) => {
        const out = { ...f, x }
        x += f.width + (/^\s+$/.test(f.text) ? extraPerSpace : 0)
        return out
      })
      lines.push({
        y,
        height,
        baseline,
        width: align === 'justify' && !isLast ? input.width : width,
        fragments: placed,
      })
      y += height
    })
  }
  return { lines, height: y, tooWide }
}

/** Largest font size (pt) used anywhere in the text. */
function maxPt(input: LayoutInput) {
  let max = input.baseStyle.sizePt
  for (const p of input.text.paragraphs)
    for (const r of p.runs) if (r.style?.sizePt) max = Math.max(max, r.style.sizePt)
  return max
}

/**
 * Lay out rich text in a box. With auto-shrink, all sizes scale down together
 * until the text fits, but never below `minPt` for the largest run.
 */
export function layoutText(input: LayoutInput, m: Measurer): TextLayout {
  let scale = 1
  let res = layoutOnce(input, m, 1)
  const fits = (r: typeof res) => r.height <= input.height + 1e-6 && !r.tooWide

  if (input.autoShrink?.enabled && !fits(res)) {
    const minScale = Math.min(1, input.autoShrink.minPt / maxPt(input))
    const atMin = layoutOnce(input, m, minScale)
    if (!fits(atMin)) {
      scale = minScale
      res = atMin
    } else {
      let lo = minScale
      let hi = 1
      let best = atMin
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2
        const r = layoutOnce(input, m, mid)
        if (fits(r)) {
          lo = mid
          best = r
        } else hi = mid
      }
      scale = lo
      res = best
    }
  }

  const overflow = !fits(res)
  const free = input.height - res.height
  const offsetY = input.vAlign === 'middle' ? free / 2 : input.vAlign === 'bottom' ? free : 0
  return { lines: res.lines, height: res.height, scale, overflow, offsetY: Math.max(0, offsetY) }
}
