import { current } from 'immer'
import type Konva from 'konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, Group, Layer, Line, Path, Rect, Stage, Transformer } from 'react-konva'
import { endVGesture, useVector, vcommit, type AnchorRef } from '../store'
import {
  bounds,
  dist,
  insertAnchor,
  nearestOnPath,
  pathData,
  removeAnchor,
  reverseSub,
  snap45,
  transform,
  translateM,
  type Matrix,
  type Pt,
  type SubPath,
} from '../geometry'
import { findItem, newPath, PEN_STYLE, type VPath } from '../model'
import { buildShape } from '../shapes'
import { addShape, selectionBounds } from '../actions'
import { isSmooth } from '../svgPath'
import { snapDelta, snapLines, snapPoint, type SnapLines } from './snapping'
import { useCoarsePointer } from '@/ui/shell/useLayout'
import { fitView, panBy, setStageSize, toDoc, toScreen, zoomTo } from './viewport'

const ACCENT = '#0e9494'

type Gesture =
  | { kind: 'pan'; last: Pt }
  | {
      kind: 'move'
      start: Pt
      originals: Map<string, VPath>
      box: { x: number; y: number; w: number; h: number }
      lines: SnapLines
      moved: boolean
    }
  | { kind: 'marquee'; start: Pt; cur: Pt; anchors: boolean; additive: boolean }
  | {
      kind: 'anchors'
      start: Pt
      originals: Map<string, SubPath[]>
      refs: AnchorRef[]
      lead: Pt
      lines: SnapLines
      moved: boolean
    }
  | { kind: 'handle'; ref: AnchorRef; which: 'hin' | 'hout'; mirror: boolean; lines: SnapLines }
  | { kind: 'penDrag'; ref: AnchorRef; alt: boolean; start: Pt; closing: boolean }
  | { kind: 'convert'; ref: AnchorRef; start: Pt; moved: boolean }
  | { kind: 'shape'; start: Pt; cur: Pt; shift: boolean; alt: boolean; lines: SnapLines }

/** The editing canvas: artboard, paths, selection, anchors and the tools. */
export function VectorCanvas() {
  const wrap = useRef<HTMLDivElement>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [hover, setHover] = useState<Pt | null>(null)
  const [preview, setPreview] = useState<Gesture | null>(null)
  const gesture = useRef<Gesture | null>(null)
  const pointers = useRef(new Map<number, Pt>())
  const pinch = useRef<{ d: number; mid: Pt } | null>(null)
  const spaceHeld = useRef(false)
  const doc = useVector((s) => s.doc)
  const selection = useVector((s) => s.selection)
  const anchorSel = useVector((s) => s.anchors)
  const tool = useVector((s) => s.tool)
  const view = useVector((s) => s.view)
  const penPathId = useVector((s) => s.penPathId)
  const shapeId = useVector((s) => s.shapeId)
  const touch = useCoarsePointer()
  // A tool gesture is running (hides the pen's rubber band).
  const [busy, setBusy] = useState(false)
  const R = touch ? 9 : 4.5 // anchor size, screen px

  // Size the stage to its box and fit the artboard the first time.
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    let first = true
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
      setStageSize(r.width, r.height)
      if (first && r.width > 0) {
        first = false
        fitView()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Space = hand while held.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.closest?.('input, textarea, select')) {
        spaceHeld.current = true
        e.preventDefault()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceHeld.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const items = useMemo(
    () =>
      doc.layers.flatMap((l) =>
        l.visible ? l.items.filter((i) => !i.hidden).map((item) => ({ item, layer: l })) : [],
      ),
    [doc],
  )
  const selItems = useMemo(
    () => items.filter((e) => selection.includes(e.item.id)),
    [items, selection],
  )

  // Transformer follows the selection (selection tool only).
  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const nodes =
      tool === 'select'
        ? selItems
            .filter((e) => !e.item.locked && !e.layer.locked)
            .map((e) => stage.findOne(`#${e.item.id}`))
            .filter((n): n is Konva.Node => !!n)
        : []
    tr.nodes(nodes)
    tr.getLayer()?.batchDraw()
  }, [selItems, tool, doc])

  /** Paths whose anchors are shown (and can be grabbed). */
  const editable = useMemo(() => {
    const ids = new Set(selection)
    if (penPathId) ids.add(penPathId)
    return items
      .filter((e) => ids.has(e.item.id) && !e.item.locked && !e.layer.locked)
      .map((e) => e.item)
  }, [items, selection, penPathId])

  const pointer = (): Pt => {
    const p = stageRef.current?.getPointerPosition() ?? { x: 0, y: 0 }
    return p
  }

  /** Anchor or handle under a screen point. */
  const hitAnchor = (sp: Pt, withHandles: boolean) => {
    const tol = R + 4
    for (const it of editable)
      for (let s = 0; s < it.subpaths.length; s++)
        for (let i = 0; i < it.subpaths[s].anchors.length; i++) {
          const a = it.subpaths[s].anchors[i]
          const ref = { pathId: it.id, sub: s, index: i }
          if (withHandles && showsHandles(ref))
            for (const which of ['hin', 'hout'] as const) {
              const h = a[which]
              if (h && dist(toScreen({ x: a.x + h.x, y: a.y + h.y }), sp) <= tol)
                return { ref, which }
            }
          if (dist(toScreen(a), sp) <= tol) return { ref, which: null }
        }
    return null
  }

  const showsHandles = (ref: AnchorRef) => {
    if (tool === 'convert') return true
    if (tool === 'pen') return ref.pathId === penPathId
    if (tool !== 'direct') return false
    // Selected anchors and their neighbours, like Illustrator.
    return anchorSel.some(
      (r) => r.pathId === ref.pathId && r.sub === ref.sub && Math.abs(r.index - ref.index) <= 1,
    )
  }

  const pathAt = (target: Konva.Node): VPath | null => {
    const id = target.id()
    if (!id) return null
    const e = items.find((x) => x.item.id === id)
    return e && !e.item.locked && !e.layer.locked ? e.item : null
  }

  const commitAnchors = (pathId: string, fn: (subs: SubPath[]) => SubPath[] | null, key?: string) =>
    vcommit((d) => {
      const f = findItem(d, pathId)
      if (!f) return
      // Hand the callback a plain copy, not the immer draft.
      const next = fn(current(f.item.subpaths) as SubPath[])
      if (!next || !next.length) f.layer.items.splice(f.index, 1)
      else f.item.subpaths = next
      delete f.item.shape
    }, key)

  const finishPen = () => {
    const s = useVector.getState()
    if (s.penPathId) {
      const f = findItem(s.doc, s.penPathId)
      // A single click isn't a path.
      if (f && f.item.subpaths.every((p) => p.anchors.length < 2))
        vcommit((d) => {
          const g = findItem(d, s.penPathId!)
          if (g) g.layer.items.splice(g.index, 1)
        })
    }
    useVector.setState({ penPathId: null })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === 'Escape') && useVector.getState().penPathId) finishPen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---------- pointer handling ----------

  const onDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    toolDown(e)
    setBusy(!!gesture.current)
  }

  const toolDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const ev = e.evt
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    if (pointers.current.size === 2) {
      // Second finger: pinch / pan, cancel the tool.
      gesture.current = null
      setPreview(null)
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: dist(a, b), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
      return
    }
    if (pointers.current.size > 2) return
    // Clicks on the transformer's handles are its own.
    if (e.target.getParent()?.className === 'Transformer') return
    const sp = pointer()
    const p = toDoc(sp)
    const s = useVector.getState()
    const t = spaceHeld.current || ev.button === 1 ? 'hand' : s.tool
    const alt = ev.altKey || s.breakHandles

    if (t === 'hand') {
      gesture.current = { kind: 'pan', last: { x: ev.clientX, y: ev.clientY } }
      return
    }

    if (t === 'select') {
      const hit = pathAt(e.target)
      if (hit) {
        let selIds = s.selection
        if (ev.shiftKey) {
          selIds = selIds.includes(hit.id)
            ? selIds.filter((x) => x !== hit.id)
            : [...selIds, hit.id]
          useVector.setState({ selection: selIds, anchors: [] })
          if (!selIds.includes(hit.id)) return
        } else if (!selIds.includes(hit.id)) {
          selIds = [hit.id]
          useVector.setState({ selection: selIds, anchors: [] })
        }
        const originals = new Map<string, VPath>()
        for (const id of selIds) {
          const f = findItem(s.doc, id)
          if (f && !f.item.locked) originals.set(id, f.item)
        }
        gesture.current = {
          kind: 'move',
          start: p,
          originals,
          box: selectionBounds([...originals.values()]) ?? { x: p.x, y: p.y, w: 0, h: 0 },
          lines: snapLines(new Set(originals.keys())),
          moved: false,
        }
      } else {
        if (!ev.shiftKey) useVector.setState({ selection: [], anchors: [] })
        gesture.current = {
          kind: 'marquee',
          start: p,
          cur: p,
          anchors: false,
          additive: ev.shiftKey,
        }
      }
      return
    }

    if (t === 'direct') {
      const a = hitAnchor(sp, true)
      if (a?.which) {
        const it = editable.find((x) => x.id === a.ref.pathId)!
        const anchor = it.subpaths[a.ref.sub].anchors[a.ref.index]
        gesture.current = {
          kind: 'handle',
          ref: a.ref,
          which: a.which,
          mirror: !alt && isSmooth(anchor),
          lines: snapLines(new Set()),
        }
        return
      }
      if (a) {
        const same = (r: AnchorRef) =>
          r.pathId === a.ref.pathId && r.sub === a.ref.sub && r.index === a.ref.index
        let refs = s.anchors
        if (ev.shiftKey) refs = refs.some(same) ? refs.filter((r) => !same(r)) : [...refs, a.ref]
        else if (!refs.some(same)) refs = [a.ref]
        useVector.setState({
          anchors: refs,
          selection: [...new Set([...s.selection, a.ref.pathId])],
        })
        startAnchorMove(p, refs, a.ref)
        return
      }
      const hit = pathAt(e.target)
      if (hit) {
        // Clicking a path picks it (and all its anchors) and lets you drag it.
        const refs: AnchorRef[] = hit.subpaths.flatMap((sub, si) =>
          sub.anchors.map((_, i) => ({ pathId: hit.id, sub: si, index: i })),
        )
        const selIds = ev.shiftKey ? [...new Set([...s.selection, hit.id])] : [hit.id]
        useVector.setState({
          selection: selIds,
          anchors: ev.shiftKey ? [...s.anchors, ...refs] : refs,
        })
        startAnchorMove(p, refs, refs[0])
        return
      }
      if (!ev.shiftKey) useVector.setState({ selection: [], anchors: [] })
      gesture.current = { kind: 'marquee', start: p, cur: p, anchors: true, additive: ev.shiftKey }
      return
    }

    if (t === 'pen') return penDown(sp, p, ev.shiftKey, alt)

    if (t === 'addAnchor') {
      let best: { id: string; hit: NonNullable<ReturnType<typeof nearestOnPath>> } | null = null
      for (const { item, layer } of items) {
        if (item.locked || layer.locked) continue
        const h = nearestOnPath(item.subpaths, p)
        if (h && (!best || h.dist < best.hit.dist)) best = { id: item.id, hit: h }
      }
      if (best && best.hit.dist * view.zoom <= 10) {
        const { id, hit } = best
        commitAnchors(id, (subs) =>
          subs.map((sub, k) => (k === hit.sub ? insertAnchor(sub, hit.seg, hit.t) : sub)),
        )
        useVector.setState({
          selection: [id],
          anchors: [{ pathId: id, sub: hit.sub, index: hit.seg + 1 }],
        })
      } else {
        const hp = pathAt(e.target)
        if (hp) useVector.setState({ selection: [hp.id], anchors: [] })
      }
      return
    }

    if (t === 'deleteAnchor') {
      const a = hitAnchor(sp, false)
      if (a)
        commitAnchors(a.ref.pathId, (subs) =>
          subs.flatMap((sub, k) =>
            k === a.ref.sub ? (removeAnchor(sub, a.ref.index) ?? []) : [sub],
          ),
        )
      else {
        const hp = pathAt(e.target)
        if (hp) useVector.setState({ selection: [hp.id], anchors: [] })
      }
      useVector.setState({ anchors: [] })
      return
    }

    if (t === 'convert') {
      const a = hitAnchor(sp, true)
      if (a?.which) {
        gesture.current = {
          kind: 'handle',
          ref: a.ref,
          which: a.which,
          mirror: false,
          lines: snapLines(new Set()),
        }
        return
      }
      if (a) {
        gesture.current = { kind: 'convert', ref: a.ref, start: p, moved: false }
        return
      }
      const hp = pathAt(e.target)
      if (hp) useVector.setState({ selection: [hp.id], anchors: [] })
      return
    }

    if (t === 'shape') {
      const lines = snapLines(new Set())
      const q = snapPoint(p, lines)
      gesture.current = {
        kind: 'shape',
        start: q,
        cur: q,
        shift: ev.shiftKey,
        alt: ev.altKey,
        lines,
      }
      setPreview(gesture.current)
    }
  }

  const startAnchorMove = (p: Pt, refs: AnchorRef[], lead: AnchorRef) => {
    const { doc: d } = useVector.getState()
    const originals = new Map<string, SubPath[]>()
    for (const r of refs) {
      const f = findItem(d, r.pathId)
      if (f && !originals.has(r.pathId)) originals.set(r.pathId, f.item.subpaths)
    }
    const la = originals.get(lead.pathId)?.[lead.sub]?.anchors[lead.index] ?? p
    gesture.current = {
      kind: 'anchors',
      start: p,
      originals,
      refs,
      lead: { x: la.x, y: la.y },
      lines: snapLines(new Set(originals.keys())),
      moved: false,
    }
  }

  const penDown = (sp: Pt, p: Pt, shift: boolean, alt: boolean) => {
    const s = useVector.getState()
    const lines = snapLines(new Set(s.penPathId ? [s.penPathId] : []))
    const drawing = s.penPathId ? findItem(s.doc, s.penPathId) : undefined
    if (drawing) {
      const subIdx = drawing.item.subpaths.length - 1
      const sub = drawing.item.subpaths[subIdx]
      const first = sub.anchors[0]
      // Click the first anchor to close the path.
      if (sub.anchors.length >= 2 && dist(toScreen(first), sp) <= R + 4) {
        vcommit((d) => {
          const f = findItem(d, s.penPathId!)!
          f.item.subpaths[subIdx].closed = true
        })
        gesture.current = {
          kind: 'penDrag',
          ref: { pathId: drawing.item.id, sub: subIdx, index: 0 },
          alt,
          start: first,
          closing: true,
        }
        return
      }
      const last = sub.anchors[sub.anchors.length - 1]
      const q = shift ? snap45(last, p) : snapPoint(p, lines)
      vcommit((d) => {
        const f = findItem(d, s.penPathId!)!
        f.item.subpaths[subIdx].anchors.push({ x: q.x, y: q.y })
      })
      gesture.current = {
        kind: 'penDrag',
        ref: { pathId: drawing.item.id, sub: subIdx, index: sub.anchors.length },
        alt,
        start: q,
        closing: false,
      }
      return
    }
    // Clicking the end of an open path continues it.
    for (const it of editable) {
      for (let si = 0; si < it.subpaths.length; si++) {
        const sub = it.subpaths[si]
        if (sub.closed || !sub.anchors.length) continue
        const endHit = dist(toScreen(sub.anchors[sub.anchors.length - 1]), sp) <= R + 4
        const startHit = dist(toScreen(sub.anchors[0]), sp) <= R + 4
        if (!endHit && !startHit) continue
        vcommit((d) => {
          const f = findItem(d, it.id)!
          const subs = f.item.subpaths
          // Work on the last subpath, with its open end last.
          let target = startHit && !endHit ? reverseSub(subs[si]) : subs[si]
          target = { ...target }
          subs.splice(si, 1)
          subs.push(target)
          delete f.item.shape
        })
        useVector.setState({ penPathId: it.id, selection: [it.id], anchors: [] })
        return
      }
    }
    const q = snapPoint(p, lines)
    const path = newPath('Path', [{ closed: false, anchors: [{ x: q.x, y: q.y }] }], PEN_STYLE)
    vcommit((d) => {
      const layer = d.layers.find((l) => l.id === s.activeLayerId) ?? d.layers[d.layers.length - 1]
      layer.items.push(path)
    })
    useVector.setState({ penPathId: path.id, selection: [path.id], anchors: [] })
    gesture.current = {
      kind: 'penDrag',
      ref: { pathId: path.id, sub: 0, index: 0 },
      alt,
      start: q,
      closing: false,
    }
  }

  const onMove = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const ev = e.evt
    if (pointers.current.has(ev.pointerId))
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const d = dist(a, b)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const rect = wrap.current!.getBoundingClientRect()
      panBy(mid.x - pinch.current.mid.x, mid.y - pinch.current.mid.y)
      zoomTo(
        useVector.getState().view.zoom * (d / pinch.current.d),
        mid.x - rect.left,
        mid.y - rect.top,
      )
      pinch.current = { d, mid }
      return
    }
    const sp = pointer()
    const p = toDoc(sp)
    const g = gesture.current
    if (!g) {
      if (useVector.getState().tool === 'pen') setHover(p)
      return
    }
    switch (g.kind) {
      case 'pan':
        panBy(ev.clientX - g.last.x, ev.clientY - g.last.y)
        g.last = { x: ev.clientX, y: ev.clientY }
        return
      case 'move': {
        let d = { x: p.x - g.start.x, y: p.y - g.start.y }
        if (ev.shiftKey) d = Math.abs(d.x) > Math.abs(d.y) ? { x: d.x, y: 0 } : { x: 0, y: d.y }
        d = snapDelta(g.box, d, g.lines)
        if (!g.moved && Math.hypot(d.x, d.y) * view.zoom < 2) return
        g.moved = true
        const m = translateM(d.x, d.y)
        vcommit((dd) => {
          for (const [id, orig] of g.originals) {
            const f = findItem(dd, id)
            if (!f) continue
            f.item.subpaths = transform(orig.subpaths, m)
            if (orig.shape && f.item.shape)
              f.item.shape.box = {
                ...orig.shape.box,
                x: orig.shape.box.x + d.x,
                y: orig.shape.box.y + d.y,
              }
          }
        }, 'move')
        return
      }
      case 'marquee':
        g.cur = p
        setPreview({ ...g })
        return
      case 'anchors': {
        const target = snapPoint(
          { x: g.lead.x + p.x - g.start.x, y: g.lead.y + p.y - g.start.y },
          g.lines,
        )
        const d = { x: target.x - g.lead.x, y: target.y - g.lead.y }
        if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) * view.zoom < 2) return
        g.moved = true
        vcommit((dd) => {
          for (const [id, orig] of g.originals) {
            const f = findItem(dd, id)
            if (!f) continue
            const subs = structuredClone(orig)
            for (const r of g.refs) {
              if (r.pathId !== id) continue
              const a = subs[r.sub]?.anchors[r.index]
              const o = orig[r.sub]?.anchors[r.index]
              if (!a || !o) continue
              a.x = o.x + d.x
              a.y = o.y + d.y
            }
            f.item.subpaths = subs
            delete f.item.shape
          }
        }, 'anchors')
        return
      }
      case 'handle': {
        const { ref, which, mirror } = g
        const q = snapPoint(p, g.lines)
        commitAnchors(
          ref.pathId,
          (subs) => {
            const next = structuredClone(subs)
            const a = next[ref.sub]?.anchors[ref.index]
            if (!a) return subs
            const h = { x: q.x - a.x, y: q.y - a.y }
            a[which] = h
            const other = which === 'hin' ? 'hout' : 'hin'
            if (mirror && !ev.altKey && a[other]) {
              const len = Math.hypot(a[other]!.x, a[other]!.y)
              const l = Math.hypot(h.x, h.y) || 1
              a[other] = { x: (-h.x / l) * len, y: (-h.y / l) * len }
            }
            return next
          },
          'handle',
        )
        return
      }
      case 'penDrag': {
        const { ref } = g
        let h = { x: p.x - g.start.x, y: p.y - g.start.y }
        if (ev.shiftKey) {
          const s = snap45(g.start, p)
          h = { x: s.x - g.start.x, y: s.y - g.start.y }
        }
        if (Math.hypot(h.x, h.y) * view.zoom < 3) return
        const alt = g.alt || ev.altKey
        commitAnchors(
          ref.pathId,
          (subs) => {
            const next = structuredClone(subs)
            const a = next[ref.sub]?.anchors[ref.index]
            if (!a) return subs
            if (g.closing) {
              // Dragging on the first anchor while closing shapes the closing curve.
              a.hin = { x: -h.x, y: -h.y }
              if (!alt) a.hout = { x: h.x, y: h.y }
            } else {
              a.hout = h
              if (!alt) a.hin = { x: -h.x, y: -h.y }
            }
            return next
          },
          'pen',
        )
        return
      }
      case 'convert': {
        const h = { x: p.x - g.start.x, y: p.y - g.start.y }
        if (!g.moved && Math.hypot(h.x, h.y) * view.zoom < 3) return
        g.moved = true
        commitAnchors(
          g.ref.pathId,
          (subs) => {
            const next = structuredClone(subs)
            const a = next[g.ref.sub]?.anchors[g.ref.index]
            if (!a) return subs
            a.hout = h
            a.hin = { x: -h.x, y: -h.y }
            return next
          },
          'convert',
        )
        return
      }
      case 'shape':
        g.cur = snapPoint(p, g.lines)
        g.shift = ev.shiftKey
        g.alt = ev.altKey
        setPreview({ ...g })
        return
    }
  }

  const onUp = (e: Konva.KonvaEventObject<PointerEvent>) => {
    pointers.current.delete(e.evt.pointerId)
    if (pinch.current) {
      if (pointers.current.size < 2) pinch.current = null
      return
    }
    const g = gesture.current
    gesture.current = null
    setPreview(null)
    setBusy(false)
    endVGesture()
    if (!g) return
    if (g.kind === 'marquee') {
      const box = rectOf(g.start, g.cur)
      if (box.w * view.zoom < 3 && box.h * view.zoom < 3) return
      const s = useVector.getState()
      const inBox = (q: Pt) =>
        q.x >= box.x && q.x <= box.x + box.w && q.y >= box.y && q.y <= box.y + box.h
      const pickable = items.filter((x) => !x.item.locked && !x.layer.locked).map((x) => x.item)
      if (g.anchors) {
        const refs: AnchorRef[] = []
        for (const it of pickable)
          it.subpaths.forEach((sub, si) =>
            sub.anchors.forEach(
              (a, i) => inBox(a) && refs.push({ pathId: it.id, sub: si, index: i }),
            ),
          )
        const ids = [...new Set(refs.map((r) => r.pathId))]
        useVector.setState({
          anchors: g.additive ? [...s.anchors, ...refs] : refs,
          selection: g.additive ? [...new Set([...s.selection, ...ids])] : ids,
        })
      } else {
        const hits = pickable
          .filter((it) => {
            const b = bounds(it.subpaths)
            return (
              b.x <= box.x + box.w &&
              b.x + b.w >= box.x &&
              b.y <= box.y + box.h &&
              b.y + b.h >= box.y
            )
          })
          .map((it) => it.id)
        useVector.setState({
          selection: g.additive ? [...new Set([...s.selection, ...hits])] : hits,
          anchors: [],
        })
      }
    }
    if (g.kind === 'convert' && !g.moved) {
      // A click turns a smooth point into a corner (or a corner into a smooth point).
      commitAnchors(g.ref.pathId, (subs) => {
        const next = structuredClone(subs)
        const sub = next[g.ref.sub]
        const a = sub?.anchors[g.ref.index]
        if (!a) return subs
        if (a.hin || a.hout) {
          delete a.hin
          delete a.hout
        } else {
          const n = sub.anchors.length
          const prev = sub.anchors[(g.ref.index - 1 + n) % n]
          const next2 = sub.anchors[(g.ref.index + 1) % n]
          const tx = (next2.x - prev.x) / 6
          const ty = (next2.y - prev.y) / 6
          a.hin = { x: -tx, y: -ty }
          a.hout = { x: tx, y: ty }
        }
        return next
      })
    }
    if (g.kind === 'penDrag' && g.closing) useVector.setState({ penPathId: null })
    if (g.kind === 'shape') {
      let box = shapeBox(g)
      if (box.w * view.zoom < 4 || box.h * view.zoom < 4) {
        // A click: a 100 px shape centred there.
        box = { x: g.start.x - 50, y: g.start.y - 50, w: 100, h: 100 }
      }
      addShape(useVector.getState().shapeId, box)
    }
  }

  const onWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const sp = pointer()
    if (e.evt.ctrlKey || e.evt.metaKey)
      zoomTo(view.zoom * Math.exp(-e.evt.deltaY * 0.01), sp.x, sp.y)
    else panBy(-e.evt.deltaX, -e.evt.deltaY)
  }

  /** Bake the transformer's change into the paths. */
  const onTransformEnd = () => {
    const tr = trRef.current
    if (!tr) return
    const nodes = tr.nodes()
    vcommit((d) => {
      for (const node of nodes) {
        const f = findItem(d, node.id())
        if (!f) continue
        const m = node.getTransform().getMatrix() as Matrix
        f.item.subpaths = transform(f.item.subpaths as SubPath[], m)
        delete f.item.shape
        node.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, skewX: 0, skewY: 0 })
      }
    })
  }

  // ---------- overlay ----------

  const z = view.zoom
  const overlay: React.ReactNode[] = []
  for (const it of editable) {
    it.subpaths.forEach((sub, si) =>
      sub.anchors.forEach((a, i) => {
        const ref = { pathId: it.id, sub: si, index: i }
        const picked = anchorSel.some((r) => r.pathId === it.id && r.sub === si && r.index === i)
        const s = toScreen(a)
        if (showsHandles(ref))
          for (const which of ['hin', 'hout'] as const) {
            const h = a[which]
            if (!h || (Math.abs(h.x) < 1e-6 && Math.abs(h.y) < 1e-6)) continue
            const hs = toScreen({ x: a.x + h.x, y: a.y + h.y })
            overlay.push(
              <Line
                key={`l${it.id}${si}${i}${which}`}
                points={[s.x, s.y, hs.x, hs.y]}
                stroke={ACCENT}
                strokeWidth={1}
                listening={false}
              />,
              <Circle
                key={`h${it.id}${si}${i}${which}`}
                x={hs.x}
                y={hs.y}
                radius={R * 0.75}
                fill="#fff"
                stroke={ACCENT}
                strokeWidth={1.5}
                listening={false}
              />,
            )
          }
        const closeCue =
          tool === 'pen' &&
          it.id === penPathId &&
          i === 0 &&
          !sub.closed &&
          sub.anchors.length >= 2 &&
          hover &&
          dist(toScreen(hover), s) <= R + 4
        overlay.push(
          <Rect
            key={`a${it.id}${si}${i}`}
            x={s.x - R}
            y={s.y - R}
            width={R * 2}
            height={R * 2}
            fill={picked ? ACCENT : '#fff'}
            stroke={ACCENT}
            strokeWidth={closeCue ? 3 : 1.5}
            cornerRadius={closeCue ? R : 0}
            listening={false}
          />,
        )
      }),
    )
  }

  // Pen rubber band from the last anchor to the pointer.
  let rubber: React.ReactNode = null
  if (tool === 'pen' && penPathId && hover && !busy) {
    const f = findItem(doc, penPathId)
    const sub = f?.item.subpaths[f.item.subpaths.length - 1]
    const last = sub?.anchors[sub.anchors.length - 1]
    if (sub && last && !sub.closed) {
      const seg: SubPath = {
        closed: false,
        anchors: [
          { ...last, hin: undefined },
          { x: hover.x, y: hover.y },
        ],
      }
      rubber = (
        <Path
          data={pathData([seg])}
          stroke={ACCENT}
          strokeWidth={1 / z}
          dash={[4 / z, 3 / z]}
          listening={false}
        />
      )
    }
  }

  const live = preview ?? null
  let previewNode: React.ReactNode = null
  if (live?.kind === 'marquee') {
    const b = rectOf(live.start, live.cur)
    previewNode = (
      <Rect
        x={b.x}
        y={b.y}
        width={b.w}
        height={b.h}
        stroke={ACCENT}
        strokeWidth={1 / z}
        dash={[4 / z, 3 / z]}
        fill="rgba(14,148,148,0.08)"
        listening={false}
      />
    )
  }
  if (live?.kind === 'shape') {
    const b = shapeBox(live)
    if (b.w > 0 && b.h > 0)
      previewNode = (
        <Path
          data={pathData(buildShape(shapeId, b))}
          stroke={ACCENT}
          strokeWidth={1 / z}
          dash={[4 / z, 3 / z]}
          listening={false}
        />
      )
  }

  const cursor =
    tool === 'hand'
      ? 'grab'
      : tool === 'pen' ||
          tool === 'shape' ||
          tool === 'addAnchor' ||
          tool === 'deleteAnchor' ||
          tool === 'convert'
        ? 'crosshair'
        : 'default'

  return (
    <div
      ref={wrap}
      className="relative min-h-0 flex-1 touch-none overflow-hidden bg-canvas"
      style={{ cursor }}
      data-testid="vector-canvas"
    >
      {size.w > 0 && (
        <Stage
          ref={stageRef}
          width={size.w}
          height={size.h}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={() => setHover(null)}
          onWheel={onWheel}
        >
          <Layer>
            <Group x={view.panX} y={view.panY} scaleX={z} scaleY={z}>
              <Rect
                width={doc.width}
                height={doc.height}
                fill="#ffffff"
                shadowColor="#000"
                shadowOpacity={0.18}
                shadowBlur={12}
                listening={false}
              />
              {doc.layers.map((l) =>
                l.visible ? (
                  <Group key={l.id} opacity={l.opacity}>
                    {l.items.map((it) =>
                      it.hidden ? null : (
                        <Path
                          key={it.id}
                          id={it.id}
                          data={pathData(it.subpaths)}
                          fill={it.style.fill ?? undefined}
                          fillEnabled={!!it.style.fill}
                          fillRule="evenodd"
                          stroke={it.style.stroke ?? undefined}
                          strokeEnabled={!!it.style.stroke && it.style.strokeWidth > 0}
                          strokeWidth={it.style.strokeWidth}
                          lineJoin={it.style.lineJoin ?? 'round'}
                          lineCap={it.style.lineCap ?? 'round'}
                          opacity={it.style.opacity}
                          hitStrokeWidth={Math.max(it.style.strokeWidth, 10 / z)}
                          listening={!it.locked && !l.locked}
                        />
                      ),
                    )}
                  </Group>
                ) : null,
              )}
              {/* Outline of selected paths. */}
              {selItems.map(({ item }) => (
                <Path
                  key={`o${item.id}`}
                  data={pathData(item.subpaths)}
                  stroke={ACCENT}
                  strokeWidth={1 / z}
                  listening={false}
                />
              ))}
              {rubber}
              {previewNode}
            </Group>
            {overlay}
            <Transformer
              ref={trRef}
              rotateEnabled
              keepRatio={false}
              ignoreStroke
              borderStroke={ACCENT}
              anchorStroke={ACCENT}
              anchorSize={touch ? 18 : 9}
              rotateAnchorOffset={touch ? 32 : 22}
              flipEnabled={false}
              onTransformEnd={onTransformEnd}
            />
          </Layer>
        </Stage>
      )}
    </div>
  )
}

const rectOf = (a: Pt, b: Pt) => ({
  x: Math.min(a.x, b.x),
  y: Math.min(a.y, b.y),
  w: Math.abs(b.x - a.x),
  h: Math.abs(b.y - a.y),
})

/** Box dragged out with the shape tool (Shift = equal sides, Alt = from the centre). */
function shapeBox(g: { start: Pt; cur: Pt; shift: boolean; alt: boolean }) {
  let dx = g.cur.x - g.start.x
  let dy = g.cur.y - g.start.y
  if (g.shift) {
    const m = Math.max(Math.abs(dx), Math.abs(dy))
    dx = Math.sign(dx || 1) * m
    dy = Math.sign(dy || 1) * m
  }
  if (g.alt)
    return {
      x: g.start.x - Math.abs(dx),
      y: g.start.y - Math.abs(dy),
      w: Math.abs(dx) * 2,
      h: Math.abs(dy) * 2,
    }
  return rectOf(g.start, { x: g.start.x + dx, y: g.start.y + dy })
}
