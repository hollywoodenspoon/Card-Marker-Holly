import Konva from 'konva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage, Transformer } from 'react-konva'
import { endGesture, useEditor } from '../editor/editorStore'
import { addGuide, moveGuide, removeGuide, select, updateElements } from '../editor/elementCommands'
import {
  activeTemplate,
  findSurfaceElement,
  isLayoutEditable,
  surfaceElements,
} from '../editor/selectors'
import { elementBounds, findElement, flatten, unionBounds, type Bounds } from '../model/tree'
import type { Element, Guide } from '../model/types'
import { buildTargets, snapBox, snapPoint, type SnapTargets } from '../tools/snap'
import { ElementNode } from './nodes/ElementNode'
import { SnapLines, TrimOverlay } from './Overlays'
import type { AssetResolver, RenderNode } from './renderTypes'
import { Rulers } from './Rulers'
import { StageCtx, type StageInteraction } from './stageContext'
import { panBy, pxPerMm, RULER, screenToMm, useViewport, zoomAt, fitToScreen } from './viewport'

Konva.hitOnDragEnabled = true

export interface CardStageProps {
  nodes: RenderNode[]
  widthMm: number
  heightMm: number
  bleedMm: number
  safeMm: number
  guides: Guide[]
  assets: AssetResolver
  renderVersion: number
  dark: boolean
  coarse: boolean
  onTextEdit?: (id: string) => void
  onImageEdit?: (id: string) => void
}

const SNAP_PX = 6

interface DragState {
  ids: string[]
  startMm: Map<string, { x: number; y: number }>
  union: Bounds
  targets: SnapTargets
  primary: string
}

export function CardStage(props: CardStageProps) {
  const { nodes, widthMm: w, heightMm: h, bleedMm, safeMm, guides, coarse, dark } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const contentRef = useRef<Konva.Group>(null)
  const trRef = useRef<Konva.Transformer>(null)
  const vp = useViewport()
  const k = pxPerMm(vp.zoom)
  const selection = useEditor((s) => s.view.selection)
  const showOverlay = useEditor((s) => s.view.showOverlay)
  const editingTextId = useEditor((s) => s.view.editingTextId)
  const mode = useEditor((s) => s.view.mode)
  const [snapLines, setSnapLines] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] })
  const [marquee, setMarquee] = useState<Bounds | null>(null)
  const [draftGuide, setDraftGuide] = useState<{ axis: 'x' | 'y'; pos: number } | null>(null)
  const drag = useRef<DragState | null>(null)
  const gesture = useRef<{
    pointers: Map<number, { x: number; y: number }>
    pinch: { d0: number; z0: number; mm: { x: number; y: number } } | null
    pan: { x: number; y: number } | null
    marquee: { x: number; y: number; additive: boolean } | null
  }>({ pointers: new Map(), pinch: null, pan: null, marquee: null })
  const spaceDown = useRef(false)

  // ---------- sizing ----------
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    let first = true
    const ro = new ResizeObserver(() => {
      useViewport.setState({ stageW: el.clientWidth, stageH: el.clientHeight })
      if (first) {
        first = false
        fitToScreen(w, h)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const s = useViewport.getState()
    if (s.cardW !== w || s.cardH !== h) fitToScreen(w, h)
  }, [w, h])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e)) spaceDown.current = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDown.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // ---------- helpers ----------
  const buildSnapTargets = useCallback(
    (exclude: Set<string>): SnapTargets => {
      const s = useEditor.getState()
      const others = surfaceElements(s)
        .filter((e) => !exclude.has(e.id) && e.defaultVisible)
        .map(elementBounds)
        .filter((b): b is Bounds => !!b)
      return buildTargets({
        widthMm: w,
        heightMm: h,
        bleedMm,
        safeMm,
        guides: activeTemplate(s)?.guides ?? [],
        others,
      })
    },
    [w, h, bleedMm, safeMm],
  )

  // ---------- selection → transformer ----------
  const editableSel = useMemo(() => {
    const s = useEditor.getState()
    return selection.filter(
      (id) => isLayoutEditable(s, id) && !findSurfaceElement(s, id)?.editLocked,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, nodes, mode])

  const selectedEls = useMemo(() => {
    const s = useEditor.getState()
    return selection.map((id) => findSurfaceElement(s, id)).filter((e): e is Element => !!e)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, nodes])

  useEffect(() => {
    const tr = trRef.current
    const stage = stageRef.current
    if (!tr || !stage) return
    const ns = editableSel
      .filter((id) => id !== editingTextId)
      .map((id) => findNode(stage, id))
      .filter((n): n is Konva.Node => !!n)
    tr.nodes(ns)
    tr.getLayer()?.batchDraw()
  }, [editableSel, nodes, editingTextId])

  const onlyImages =
    selectedEls.length > 0 &&
    selectedEls.every((e) => e.type === 'image' || e.type === 'imageField')
  const hasGroup = selectedEls.some((e) => e.type === 'group')

  // ---------- interaction context ----------
  const ctx: StageInteraction = useMemo(
    () => ({
      assets: props.assets,
      renderVersion: props.renderVersion,
      hiddenId: editingTextId,
      isEditable: (id) => {
        const s = useEditor.getState()
        const el = findSurfaceElement(s, id)
        return !!el && !el.editLocked && isLayoutEditable(s, id)
      },
      isSelectable: (id) => {
        const el = findSurfaceElement(useEditor.getState(), id)
        return !!el && !el.editLocked
      },
      onElementPointerDown: (e, id) => {
        if (gesture.current.pinch || spaceDown.current || e.evt.button === 1) return
        e.cancelBubble = true
        const s = useEditor.getState()
        const additive = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey
        // Clicking inside an already-selected group drills into the child.
        const target = drillTarget(e.target, id, s.view.selection)
        if (additive) {
          const sel = s.view.selection.includes(target)
            ? s.view.selection.filter((x) => x !== target)
            : [...s.view.selection, target]
          select(sel)
        } else if (!s.view.selection.includes(target)) {
          select([target])
        }
      },
      onElementDblClick: (id) => {
        const el = findSurfaceElement(useEditor.getState(), id)
        if (!el) return
        if (el.type === 'text') props.onTextEdit?.(id)
        else if (el.type === 'image' || el.type === 'imageField') props.onImageEdit?.(id)
      },
      dragBoundFunc: (id) => (pos) => {
        const d = drag.current
        const node = findNode(stageRef.current, id)
        const { panX, panY, zoom } = useViewport.getState()
        const kk = pxPerMm(zoom)
        if (!d || !node) return pos
        const start = d.startMm.get(id)
        if (!start) return pos
        // Leaves: node position is the element position; groups: an offset from 0,0.
        const isGroup = node.hasName('group-el')
        const base = isGroup ? { x: 0, y: 0 } : start
        let dx = (pos.x - panX) / kk - base.x
        let dy = (pos.y - panY) / kk - base.y
        if (useEditor.getState().view.snapping && d.primary === id) {
          const r = snapBox(
            { ...d.union, xMm: d.union.xMm + dx, yMm: d.union.yMm + dy },
            d.targets,
            SNAP_PX / kk,
          )
          dx += r.dx
          dy += r.dy
          setSnapLines({ xs: r.linesX, ys: r.linesY })
        }
        return { x: panX + (base.x + dx) * kk, y: panY + (base.y + dy) * kk }
      },
      onDragStart: (id) => {
        if (drag.current) return
        const s = useEditor.getState()
        const ids = s.view.selection.includes(id)
          ? s.view.selection.filter((x) => isLayoutEditable(s, x))
          : [id]
        const els = ids.map((x) => findSurfaceElement(s, x)).filter((e): e is Element => !!e)
        const startMm = new Map(els.map((e) => [e.id, { x: e.xMm, y: e.yMm }]))
        const exclude = new Set(els.flatMap((e) => flatten([e]).map((c) => c.id)))
        drag.current = {
          ids,
          startMm,
          union: unionBounds(els.map(elementBounds)) ?? { xMm: 0, yMm: 0, wMm: 0, hMm: 0 },
          targets: buildSnapTargets(exclude),
          primary: id,
        }
      },
      onDragEnd: () => {
        const d = drag.current
        const stage = stageRef.current
        if (!d || !stage) return
        drag.current = null
        setSnapLines({ xs: [], ys: [] })
        const node = findNode(stage, d.primary)
        if (!node) return
        const start = d.startMm.get(d.primary)!
        const isGroup = node.hasName('group-el')
        const dx = isGroup ? node.x() : node.x() - start.x
        const dy = isGroup ? node.y() : node.y() - start.y
        // Reset group nodes; leaves get their position from the new props.
        for (const id of d.ids) {
          const n = findNode(stage, id)
          if (n?.hasName('group-el')) n.position({ x: 0, y: 0 })
        }
        if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return
        updateElements(d.ids, (el) => {
          translate(el, dx, dy)
        })
        endGesture()
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.assets, props.renderVersion, editingTextId, buildSnapTargets],
  )

  // ---------- transformer ----------
  const onTransform = (final: boolean) => {
    const tr = trRef.current
    if (!tr) return
    const s = useEditor.getState()
    const patches: { id: string; apply: (el: Element) => void }[] = []
    for (const node of tr.nodes()) {
      const id = node.id()
      const el = findSurfaceElement(s, id)
      if (!el) continue
      const sx = node.scaleX()
      const sy = node.scaleY()
      if (el.type === 'group') {
        const gx = node.x()
        const gy = node.y()
        if (!final) continue // groups are scaled visually until release
        node.scale({ x: 1, y: 1 })
        node.position({ x: 0, y: 0 })
        patches.push({
          id,
          apply: (g) => {
            const scaleAll = (els: Element[]) =>
              els.forEach((c) => {
                if (c.type === 'group') return scaleAll(c.children)
                c.xMm = gx + c.xMm * sx
                c.yMm = gy + c.yMm * sy
                c.wMm *= sx
                c.hMm *= sy
              })
            if (g.type === 'group') scaleAll(g.children)
          },
        })
        continue
      }
      const x = node.x()
      const y = node.y()
      const rotation = node.rotation()
      node.scale({ x: 1, y: 1 })
      patches.push({
        id,
        apply: (e) => {
          e.xMm = x
          e.yMm = y
          e.wMm = Math.max(0.5, el.wMm * sx)
          e.hMm = Math.max(0.5, el.hMm * sy)
          e.rotation = normAngle(rotation)
        },
      })
    }
    if (!patches.length) return
    const byId = new Map(patches.map((p) => [p.id, p.apply]))
    updateElements([...byId.keys()], (el) => byId.get(el.id)?.(el as Element), 'transform')
    if (final) {
      endGesture()
      setSnapLines({ xs: [], ys: [] })
    }
  }

  const anchorSnap = (_old: Konva.Vector2d, pos: Konva.Vector2d) => {
    if (!useEditor.getState().view.snapping) return pos
    const tr = trRef.current
    const { panX, panY, zoom } = useViewport.getState()
    const kk = pxPerMm(zoom)
    // Only snap unrotated selections; rotated boxes would skew.
    if (tr && tr.nodes().some((n) => Math.abs(n.rotation()) > 0.01)) return pos
    const ex = new Set(selection)
    const t = buildSnapTargets(ex)
    const p = snapPoint({ x: (pos.x - panX) / kk, y: (pos.y - panY) / kk }, t, SNAP_PX / kk)
    setSnapLines({ xs: p.linesX, ys: p.linesY })
    return { x: panX + p.x * kk, y: panY + p.y * kk }
  }

  // ---------- stage pointer handling (empty area, gestures) ----------
  const localPoint = (e: PointerEvent | WheelEvent) => {
    const r = wrapRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const stopKonvaDrags = () => {
    stageRef.current?.find('.element').forEach((n) => n.isDragging() && n.stopDrag())
    drag.current = null
    setSnapLines({ xs: [], ys: [] })
  }

  const onPointerDownCapture = (e: React.PointerEvent) => {
    const g = gesture.current
    const p = localPoint(e.nativeEvent)
    g.pointers.set(e.pointerId, p)
    if (g.pointers.size === 2) {
      // Two fingers: pinch-zoom and pan. Cancel any drag the first finger started.
      stopKonvaDrags()
      g.marquee = null
      setMarquee(null)
      const [a, b] = [...g.pointers.values()]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      g.pinch = { d0: dist(a, b), z0: useViewport.getState().zoom, mm: screenToMm(mid.x, mid.y) }
      e.stopPropagation()
      return
    }
    if (e.button === 1 || spaceDown.current) {
      g.pan = p
      e.stopPropagation()
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g.pointers.has(e.pointerId)) return
    const p = localPoint(e.nativeEvent)
    g.pointers.set(e.pointerId, p)
    if (g.pinch && g.pointers.size >= 2) {
      const [a, b] = [...g.pointers.values()]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const z = g.pinch.z0 * (dist(a, b) / Math.max(1, g.pinch.d0))
      zoomAt(z)
      const kk = pxPerMm(useViewport.getState().zoom)
      useViewport.setState({ panX: mid.x - g.pinch.mm.x * kk, panY: mid.y - g.pinch.mm.y * kk })
      return
    }
    if (g.pan) {
      panBy(p.x - g.pan.x, p.y - g.pan.y)
      g.pan = p
      return
    }
    if (g.marquee) {
      const a = screenToMm(g.marquee.x, g.marquee.y)
      const b = screenToMm(p.x, p.y)
      setMarquee({
        xMm: Math.min(a.x, b.x),
        yMm: Math.min(a.y, b.y),
        wMm: Math.abs(a.x - b.x),
        hMm: Math.abs(a.y - b.y),
      })
    }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    g.pointers.delete(e.pointerId)
    if (g.pointers.size < 2) g.pinch = null
    if (g.pointers.size === 0) g.pan = null
    if (g.marquee) {
      const m = marquee
      const additive = g.marquee.additive
      g.marquee = null
      setMarquee(null)
      if (m && m.wMm + m.hMm > 0.5) {
        const s = useEditor.getState()
        const hit = surfaceElements(s)
          .filter((el) => !el.editLocked)
          .filter((el) => {
            const b = elementBounds(el)
            return b && intersects(b, m)
          })
          .filter((el) => !!findNode(stageRef.current, el.id))
          .map((el) => el.id)
        select(additive ? [...new Set([...s.view.selection, ...hit])] : hit)
      }
    }
  }

  const onStagePointerDown = (e: Konva.KonvaEventObject<PointerEvent>) => {
    const g = gesture.current
    if (g.pinch || g.pan) return
    // Empty canvas: clear selection; with a mouse, start a marquee.
    if (e.target === e.target.getStage() || e.target.name() === 'backdrop') {
      const additive = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey
      if (!additive) select([])
      if (e.evt.pointerType === 'mouse' && e.evt.button === 0) {
        const p = localPoint(e.evt)
        g.marquee = { ...p, additive }
      }
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    const p = localPoint(e.nativeEvent)
    if (e.ctrlKey || e.metaKey) {
      zoomAt(useViewport.getState().zoom * Math.exp(-e.deltaY * 0.01), p.x, p.y)
    } else {
      panBy(-e.deltaX, -e.deltaY)
    }
  }

  // Prevent page zoom on ctrl+wheel (needs a non-passive listener).
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const prevent = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', prevent, { passive: false })
    return () => el.removeEventListener('wheel', prevent)
  }, [])

  // ---------- guides ----------
  const onGuideStart = (axis: 'x' | 'y', e: Konva.KonvaEventObject<PointerEvent>) => {
    e.cancelBubble = true
    const stage = stageRef.current!
    const move = (ev: PointerEvent) => {
      const p = localPoint(ev)
      const mm = screenToMm(p.x, p.y)
      setDraftGuide({ axis, pos: roundMm(axis === 'x' ? mm.x : mm.y) })
    }
    const up = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      const p = localPoint(ev)
      setDraftGuide(null)
      if ((axis === 'x' ? p.x : p.y) > RULER) {
        const mm = screenToMm(p.x, p.y)
        addGuide(axis, roundMm(axis === 'x' ? mm.x : mm.y))
      }
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    void stage
  }

  const rulerBg = dark ? '#26262b' : '#f4f4f6'
  const rulerFg = dark ? '#a1a1aa' : '#6b6b76'
  const anchor = coarse ? 22 : 9
  const clip = showOverlay
    ? { x: -bleedMm, y: -bleedMm, w: w + 2 * bleedMm, h: h + 2 * bleedMm }
    : { x: 0, y: 0, w, h }

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 touch-none select-none"
      onPointerDownCapture={onPointerDownCapture}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      data-testid="card-stage"
    >
      {vp.stageW > 0 && (
        <Stage
          ref={stageRef}
          width={vp.stageW}
          height={vp.stageH}
          onPointerDown={onStagePointerDown}
        >
          <Layer>
            <Rect name="backdrop" width={vp.stageW} height={vp.stageH} fill="transparent" />
            <Group ref={contentRef} x={vp.panX} y={vp.panY} scaleX={k} scaleY={k}>
              {/* paper */}
              <Rect
                x={clip.x}
                y={clip.y}
                width={clip.w}
                height={clip.h}
                fill="#ffffff"
                shadowColor="#000"
                shadowOpacity={0.25}
                shadowBlur={12 / k}
                shadowOffsetY={2 / k}
                listening={false}
              />
              <Group clipX={clip.x} clipY={clip.y} clipWidth={clip.w} clipHeight={clip.h}>
                <StageCtx.Provider value={ctx}>
                  {nodes.map((n) => (
                    <ElementNode key={n.element.id} node={n} />
                  ))}
                </StageCtx.Provider>
              </Group>
              {showOverlay && <TrimOverlay w={w} h={h} bleed={bleedMm} safe={safeMm} />}
              {/* outlines for selected parts whose layout is fixed in this mode */}
              {selectedEls
                .filter((el) => !editableSel.includes(el.id) && el.type !== 'group')
                .map((el) => (
                  <Rect
                    key={'sel' + el.id}
                    x={el.xMm}
                    y={el.yMm}
                    width={el.wMm}
                    height={el.hMm}
                    rotation={el.rotation}
                    stroke="#6d5dfc"
                    strokeWidth={1.5}
                    dash={[5, 3]}
                    strokeScaleEnabled={false}
                    listening={false}
                  />
                ))}
              <GuidesLayer
                guides={guides}
                draft={draftGuide}
                w={w}
                h={h}
                k={k}
                onMove={(id, pos) => moveGuide(id, roundMm(pos), 'guide:' + id)}
                onDrop={(id, screenPos) => {
                  if (screenPos < RULER) removeGuide(id)
                  endGesture()
                }}
              />
              <SnapLines xs={snapLines.xs} ys={snapLines.ys} w={w} h={h} />
              {marquee && (
                <Rect
                  x={marquee.xMm}
                  y={marquee.yMm}
                  width={marquee.wMm}
                  height={marquee.hMm}
                  fill="rgba(109,93,252,0.08)"
                  stroke="#6d5dfc"
                  strokeWidth={1}
                  strokeScaleEnabled={false}
                  listening={false}
                />
              )}
            </Group>
            <Transformer
              ref={trRef}
              rotateEnabled={!hasGroup}
              flipEnabled={false}
              keepRatio={onlyImages}
              shiftBehavior={onlyImages ? 'inverted' : 'default'}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={4}
              anchorSize={anchor}
              anchorCornerRadius={anchor / 2}
              anchorStroke="#6d5dfc"
              anchorFill="#ffffff"
              borderStroke="#6d5dfc"
              borderStrokeWidth={1.5}
              rotateAnchorOffset={coarse ? 36 : 24}
              padding={0}
              ignoreStroke
              anchorDragBoundFunc={anchorSnap}
              boundBoxFunc={(oldBox, newBox) =>
                Math.abs(newBox.width) < 4 || Math.abs(newBox.height) < 4 ? oldBox : newBox
              }
              onTransform={() => onTransform(false)}
              onTransformEnd={() => onTransform(true)}
            />
            <Rulers
              stageW={vp.stageW}
              stageH={vp.stageH}
              panX={vp.panX}
              panY={vp.panY}
              k={k}
              bg={rulerBg}
              fg={rulerFg}
              onGuideStart={onGuideStart}
            />
          </Layer>
        </Stage>
      )}
    </div>
  )
}

function GuidesLayer({
  guides,
  draft,
  w,
  h,
  k,
  onMove,
  onDrop,
}: {
  guides: Guide[]
  draft: { axis: 'x' | 'y'; pos: number } | null
  w: number
  h: number
  k: number
  onMove: (id: string, pos: number) => void
  onDrop: (id: string, screenPos: number) => void
}) {
  const pad = Math.max(w, h) * 4
  const line = (axis: 'x' | 'y', pos: number) =>
    axis === 'x' ? [pos, -pad, pos, h + pad] : [-pad, pos, w + pad, pos]
  return (
    <Group>
      {guides.map((g) => (
        <Line
          key={g.id}
          points={line(g.axis, g.posMm)}
          stroke="#00a3ff"
          strokeWidth={1}
          hitStrokeWidth={10 / k}
          strokeScaleEnabled={false}
          draggable
          dragBoundFunc={(pos) => (g.axis === 'x' ? { x: pos.x, y: 0 } : { x: 0, y: pos.y })}
          onDragMove={(e) => {
            const n = e.target
            const delta = g.axis === 'x' ? n.x() : n.y()
            onMove(g.id, g.posMm + delta)
            n.position({ x: 0, y: 0 })
          }}
          onDragEnd={(e) => {
            const stagePos = e.target.getStage()?.getPointerPosition()
            onDrop(g.id, stagePos ? (g.axis === 'x' ? stagePos.x : stagePos.y) : RULER + 1)
          }}
          onPointerDown={(e) => (e.cancelBubble = true)}
        />
      ))}
      {draft && (
        <Line
          points={line(draft.axis, draft.pos)}
          stroke="#00a3ff"
          strokeWidth={1}
          dash={[4, 4]}
          strokeScaleEnabled={false}
          listening={false}
        />
      )}
    </Group>
  )
}

// ---------- small utils ----------

/** Konva's selector syntax isn't CSS, so look nodes up by id with a predicate. */
function findNode(stage: Konva.Stage | null | undefined, id: string): Konva.Node | undefined {
  return stage?.findOne((n: Konva.Node) => n.id() === id)
}

function translate(el: Element, dx: number, dy: number) {
  if (el.type === 'group') el.children.forEach((c) => translate(c, dx, dy))
  else {
    el.xMm += dx
    el.yMm += dy
  }
}

/** If `id` is a selected group and the pointer hit one of its children, return that child. */
function drillTarget(target: Konva.Node, id: string, selection: string[]): string {
  if (!selection.includes(id)) return id
  const s = useEditor.getState()
  const el = findSurfaceElement(s, id)
  if (el?.type !== 'group') return id
  let n: Konva.Node | null = target
  while (n && n.id() !== id) {
    if (n.name() === 'element' && findElement(el.children, n.id())) {
      // keep walking: we want the direct child of this group
      const parentEl = n.getParent()
      if (parentEl?.id() === id) return n.id()
    }
    n = n.getParent()
  }
  return id
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y)

const intersects = (a: Bounds, b: Bounds) =>
  a.xMm < b.xMm + b.wMm && a.xMm + a.wMm > b.xMm && a.yMm < b.yMm + b.hMm && a.yMm + a.hMm > b.yMm

const roundMm = (v: number) => Math.round(v * 10) / 10

const normAngle = (a: number) => {
  const r = ((a % 360) + 360) % 360
  return Math.round(r * 100) / 100
}

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
}
