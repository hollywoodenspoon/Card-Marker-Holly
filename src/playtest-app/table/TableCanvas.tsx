import { MoreHorizontal } from '@/ui/icons'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { actor } from '@/adventure/engine'
import { other, type AsState, type Seat } from '@/adventure/state'
import { valuesAt } from '@/adventure/stats'
import { pieceId, regroupHand } from '@/adventure/table'
import { cn } from '@/lib/cn'
import { seenBy } from '@/playtest/actions'
import { pieceBoxes, targetAt, type PieceBox } from '@/playtest/geometry'
import {
  LABEL,
  parseZoneKey,
  slotCount,
  slotRect,
  tableLayout,
  zoneKey,
  type PlacedZone,
  type TableLayout,
  type TokenDef,
} from '@/playtest/setup'
import type { TokenAt, TokenInst } from '@/playtest/state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { usePanZoom } from '@/ui/components/usePanZoom'
import { ZoomBar } from '@/ui/components/ZoomBar'
import { cues, type ArrowEnd } from './cues'
import { PieceFace, PieceView, TokenShape, type PieceStats } from './Piece'
import { usePack } from './packContext'
import { optionPiece, hints as ruleHints } from './rulesPlay'
import { shownBefore, shownRules, usePlaytest } from './usePlaytest'

/** Space around the table (mm), so labels above the top zones show. */
const MARGIN = 10
const NO_URLS: Record<string, string> = {}
/** Pointer travel (px) that turns a press into a drag. */
const DRAG_PX = 6

type Gesture = {
  kind: 'piece' | 'token' | 'pan'
  id: string
  x0: number
  y0: number
  last: { x: number; y: number }
  moved: boolean
}

/**
 * The table: zones and pieces drawn in mm × zoom. Tap a piece to select it,
 * drag it to move it (onto an occupied slot to swap), drag the empty table
 * to pan, pinch or Ctrl + wheel to zoom.
 */
export function TableCanvas({
  onOpenZone,
  onPreview,
  staged,
}: {
  onOpenZone: (key: string) => void
  /** A card the viewer can see was tapped: show it in the preview window. */
  onPreview?: (pieceId: string) => void
  /** Cards drawn on the combat stage (faint on the table). */
  staged?: Set<string>
}) {
  const setup = usePlaytest((s) => s.setup)!
  const state = usePlaytest((s) => s.state)!
  const selected = usePlaytest((s) => s.selected)
  const placing = usePlaytest((s) => s.placing)
  const viewer = usePlaytest((s) => s.viewer)
  const act = usePlaytest((s) => s.act)
  const select = usePlaytest((s) => s.select)
  const rules = usePlaytest((s) => s.rules)
  const picks = usePlaytest((s) => s.picks)
  const tapRules = usePlaytest((s) => s.tapRules)
  // With the rules on: what the player to act may tap.
  const bots = usePlaytest((s) => s.bots)
  const watching = usePlaytest((s) => !!s.playback || !!s.replay)
  const shown = usePlaytest(shownRules)
  const before = usePlaytest(shownBefore)
  const hint = useMemo(() => {
    const a = rules ? actor(rules) : null
    return rules && !watching && !(a !== null && bots[a]) ? ruleHints(rules, picks) : null
  }, [rules, picks, bots, watching])
  // While actions are shown: what the one on screen changed.
  const cue = useMemo(
    () => (shown && before && shown.log.length > before.log.length ? cues(before, shown) : null),
    [shown, before],
  )
  const choice = usePlaytest((s) => s.choice)
  const pickedIds = useMemo(() => {
    const st = rules?.step
    // A card tapped for a choice waits, marked, for the confirm button.
    if (rules && st?.k === 'choose' && choice) {
      const id = optionPiece(rules, choice)
      return new Set(id ? [id] : [])
    }
    if (!rules || st?.k !== 'reveal') return new Set<string>()
    const opp = other(st.seat)
    return new Set(picks.map((i) => pieceId(opp, rules.players[opp].field[i].card ?? '')))
  }, [rules, picks, choice])
  // Every card's Attack, Defense and Fighting Spirit, as they count now (locked in combat).
  const stats = useMemo(() => {
    const out: Record<string, PieceStats> = {}
    if (!shown) return out
    for (const seat of [0, 1] as const) {
      const p = shown.players[seat]
      p.field.forEach((f, slot) => {
        const c = f.card ? shown.cards[f.card] : null
        if (!c) return
        const v = valuesAt(shown, seat, slot)
        out[pieceId(seat, f.card!)] = { a: v.a, d: v.d, fs: c.fs, da: v.a - c.a, dd: v.d - c.d }
      })
      for (const card of [...p.support, ...p.rest, ...p.spent]) {
        const c = shown.cards[card]
        if (c) out[pieceId(seat, card)] = { a: c.a, d: c.d, fs: c.fs }
      }
    }
    return out
  }, [shown])
  // In combat, attackers glow red and defenders green, until Regroup.
  const roles = useMemo(() => {
    const out: Record<string, 'attack' | 'defend'> = {}
    if (!shown?.combat) return out
    for (const seat of [0, 1] as const)
      for (const f of shown.players[seat].field) {
        if (f.card && f.state === 'attacking') out[pieceId(seat, f.card)] = 'attack'
        if (f.card && f.state === 'defending') out[pieceId(seat, f.card)] = 'defend'
      }
    return out
  }, [shown])
  // Someone is about to move: the cards they pick lift, with a pointer on them.
  const intent = usePlaytest((s) => (s.playback && s.playback.i < 0 ? s.playback.intent : null))
  const lifted = useMemo(() => new Set(intent?.pieces ?? []), [intent])
  // The acting player's half of the table glows in their colour.
  const turnSeat = shown ? actor(shown) : null
  const pack = usePack()
  const faces = pack.faces
  const defaultSize = pack.info.cardSize
  const layout = useMemo(() => tableLayout(setup), [setup])
  const sizeOf = useCallback(
    (id: string) => {
      const f = faces[state.pieces[id]?.cardId]
      return f ? { w: f.w, h: f.h } : defaultSize
    },
    [faces, state.pieces, defaultSize],
  )
  const boxes = useMemo(() => {
    const raw = pieceBoxes(setup, layout, state, sizeOf)
    return shown?.combat ? stackOnField(raw, shown, layout) : raw
  }, [setup, layout, state, sizeOf, shown])
  /** Where an arrow end sits, in table mm. */
  const endAt = (e: ArrowEnd): { x: number; y: number } | null => {
    if ('piece' in e) {
      const b = boxes.find((x) => x.id === e.piece)
      if (b) return { x: b.cx, y: b.cy }
      const key = Object.keys(state.zones).find((z) => {
        const zc = state.zones[z]
        return zc.items?.includes(e.piece) || zc.slots?.some((ids) => ids.includes(e.piece))
      })
      return key ? endAt({ zone: key }) : null
    }
    const pzn = layout.zones.find((z) => z.key === e.zone)
    if (!pzn) return null
    if (e.slot === undefined) return { x: pzn.x + pzn.w / 2, y: pzn.y + pzn.h / 2 }
    const r = slotRect(pzn.zone, e.slot, pzn.turned)
    return { x: pzn.x + r.x + r.w / 2, y: pzn.y + r.y + r.h / 2 }
  }
  // Token and board pictures from assets aren't in game packs yet (shapes and card boards are).
  const urls = NO_URLS
  const seatColor = (seat: number | null) =>
    seat === null ? '#64748b' : (setup.seats[seat]?.color ?? '#64748b')
  const tokenColor = useCallback(
    (t: TokenInst) => {
      const def = setup.tokens.find((d) => d.id === t.tokenId)
      return !def || def.color === 'seat' ? seatColor(t.owner) : def.color
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setup],
  )
  const tokenUrl = useCallback(
    (def: TokenDef) => (def.assetId ? urls[def.assetId] : undefined),
    [urls],
  )

  // View: zoom is relative to "fit"; x / y pan from the centre.
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const turnBox = useMemo(() => {
    if (turnSeat === null) return null
    const mine = layout.zones.filter((z) => parseZoneKey(z.key).seat === turnSeat)
    if (!mine.length) return null
    const x = Math.min(...mine.map((z) => z.x))
    const y = Math.min(...mine.map((z) => z.y - LABEL))
    const r = Math.max(...mine.map((z) => z.x + z.w))
    const b = Math.max(...mine.map((z) => z.y + z.h))
    return { seat: turnSeat, x, y, w: r - x, h: b - y }
  }, [layout, turnSeat])
  const fitK = size.w
    ? Math.min(size.w / (layout.w + MARGIN * 2), size.h / (layout.h + MARGIN * 2))
    : 1
  const k = fitK * view.zoom
  const ox = (size.w - layout.w * k) / 2 + view.x
  const oy = (size.h - layout.h * k) / 2 + view.y
  const fit = () => setView({ zoom: 1, x: 0, y: 0 })
  const zoomBy = (f: number, at?: { x: number; y: number }) =>
    setView((v) => {
      const zoom = Math.min(8, Math.max(0.3, v.zoom * f))
      const r = zoom / v.zoom
      const c = at ? { x: at.x - size.w / 2, y: at.y - size.h / 2 } : { x: 0, y: 0 }
      return { zoom, x: c.x - (c.x - v.x) * r, y: c.y - (c.y - v.y) * r }
    })
  const pz = usePanZoom(ref, {
    onZoom: zoomBy,
    onPan: (dx, dy) => setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy })),
    onFit: fit,
  })

  const toTable = (clientX: number, clientY: number) => {
    const r = ref.current!.getBoundingClientRect()
    return { x: (clientX - r.left - ox) / k, y: (clientY - r.top - oy) / k }
  }
  /** The smallest zone under a point (its name strip counts as the zone). */
  const zoneAt = (x: number, y: number): PlacedZone | undefined =>
    layout.zones
      .filter((z) => x >= z.x && x <= z.x + z.w && y >= z.y - LABEL && y <= z.y + z.h)
      .sort((a, b) => a.w * a.h - b.w * b.h)[0]
  const pieceAt = (x: number, y: number): PieceBox | undefined =>
    boxes
      .filter((b) => {
        const turned = Math.abs(b.rotation % 180) === 90
        const w = turned ? b.h : b.w
        const h = turned ? b.w : b.h
        return Math.abs(x - b.cx) <= w / 2 && Math.abs(y - b.cy) <= h / 2
      })
      .sort((a, b) => b.z - a.z)[0]

  /** Put the selected (or dragged) piece or token where the table point is. */
  const placeAt = (kind: 'piece' | 'token', id: string, x: number, y: number) => {
    const pzn = zoneAt(x, y)
    if (kind === 'piece') {
      if (!pzn) return
      return act({ t: 'move', piece: id, to: targetAt(pzn, x, y, boxes) })
    }
    const onPiece = pieceAt(x, y)
    let to: TokenAt = { pool: true }
    if (onPiece) to = { piece: onPiece.id }
    else if (pzn?.zone.kind === 'grid') {
      const t = targetAt(pzn, x, y, boxes)
      to = { zone: pzn.key, slot: t.slot }
    } else if (pzn?.zone.kind === 'area') to = { zone: pzn.key, x: x - pzn.x, y: y - pzn.y }
    act({ t: 'token', token: id, to })
  }

  const g = useRef<Gesture | null>(null)
  const pointers = useRef(new Set<number>())
  const [drag, setDrag] = useState<{
    kind: 'piece' | 'token'
    id: string
    x: number
    y: number
    /** The zone under the pointer (highlighted). */
    zone?: string
  } | null>(null)

  const handlers = {
    ...pz.handlers,
    onPointerDown: (e: React.PointerEvent) => {
      pz.handlers.onPointerDown(e)
      pointers.current.add(e.pointerId)
      if (pointers.current.size > 1 || pz.cursor) {
        g.current = null
        setDrag(null)
        return
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return
      const t = e.target as HTMLElement
      if (t.closest('[data-zone-menu]')) return
      const tok = t.closest<HTMLElement>('[data-token]')
      const pc = t.closest<HTMLElement>('[data-piece]')
      g.current = tok
        ? {
            kind: 'token',
            id: tok.dataset.token!,
            x0: e.clientX,
            y0: e.clientY,
            last: { x: e.clientX, y: e.clientY },
            moved: false,
          }
        : pc
          ? {
              kind: 'piece',
              id: pc.dataset.piece!,
              x0: e.clientX,
              y0: e.clientY,
              last: { x: e.clientX, y: e.clientY },
              moved: false,
            }
          : {
              kind: 'pan',
              id: '',
              x0: e.clientX,
              y0: e.clientY,
              last: { x: e.clientX, y: e.clientY },
              moved: false,
            }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      pz.handlers.onPointerMove(e)
      const cur = g.current
      if (!cur) return
      if (!cur.moved && Math.hypot(e.clientX - cur.x0, e.clientY - cur.y0) > DRAG_PX)
        cur.moved = true
      if (!cur.moved) return
      if (cur.kind === 'pan') {
        const dx = e.clientX - cur.last.x
        const dy = e.clientY - cur.last.y
        setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
      } else {
        const p = toTable(e.clientX, e.clientY)
        setDrag({
          kind: cur.kind,
          id: cur.id,
          x: e.clientX,
          y: e.clientY,
          zone: zoneAt(p.x, p.y)?.key,
        })
      }
      cur.last = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e: React.PointerEvent) => {
      pz.handlers.onPointerUp(e)
      pointers.current.delete(e.pointerId)
      const cur = g.current
      g.current = null
      setDrag(null)
      if (!cur) return
      const p = toTable(e.clientX, e.clientY)
      if (cur.moved) {
        if (cur.kind !== 'pan') placeAt(cur.kind, cur.id, p.x, p.y)
        return
      }
      tap(cur, p)
    },
    onPointerCancel: (e: React.PointerEvent) => {
      pz.handlers.onPointerCancel(e)
      pointers.current.delete(e.pointerId)
      g.current = null
      setDrag(null)
    },
  }

  const tap = (cur: Gesture, p: { x: number; y: number }) => {
    if (cur.kind === 'piece' && onPreview && seenBy(setup, state, cur.id, viewer) !== 'back')
      onPreview(cur.id)
    // With the rules on, a tap on a card can be a move (a reveal) or pick a card to place.
    if (rules && cur.kind === 'piece') {
      const same = selected?.kind === 'piece' && selected.id === cur.id
      if (same) return select(null)
      if (tapRules(cur.id)) return
    }
    // Tap-to-place: the selection goes where you tap.
    if (placing && selected) {
      if (cur.kind === 'piece' && selected.kind === 'piece' && cur.id === selected.id)
        return select(null)
      return placeAt(selected.kind, selected.id, p.x, p.y)
    }
    const zone = zoneAt(p.x, p.y)
    if (zone?.zone.kind === 'stack' && cur.kind !== 'token') return onOpenZone(zone.key)
    if (cur.kind === 'pan') return select(null)
    const same = selected?.kind === cur.kind && selected.id === cur.id
    select(same ? null : { kind: cur.kind, id: cur.id })
  }

  const label = Math.min(15, Math.max(10, 3.4 * k))
  // Regroup: the Support row holds the rest zone, and the Support is set aside.
  const regroup = !!shown && regroupHand(shown)
  const zoneLabel = (key: string, name: string, count: number | null) => {
    const { zoneId, seat } = parseZoneKey(key)
    if (regroup && shown && seat !== null && (seat === 0 || seat === 1)) {
      if (zoneId === 'support') return `Rest zone: Regroup hand (${count ?? 0})`
      if (zoneId === 'rest') return `Support set aside (${shown.players[seat].support.length})`
    }
    return count === null ? name : `${name} (${count})`
  }
  const dropZone = drag?.zone

  const tokensAt = (key: string) =>
    Object.values(state.tokens).filter((t) => 'zone' in t.at && t.at.zone === key)
  const onPiece = useMemo(() => {
    const m: Record<string, TokenInst[]> = {}
    for (const t of Object.values(state.tokens)) if ('piece' in t.at) (m[t.at.piece] ??= []).push(t)
    return m
  }, [state.tokens])

  const dragged = drag?.kind === 'piece' ? state.pieces[drag.id] : undefined
  return (
    <div
      ref={ref}
      className="relative min-h-0 flex-1 touch-none overflow-hidden bg-canvas"
      style={{ cursor: pz.cursor ?? (placing ? 'crosshair' : undefined) }}
      data-testid="playtest-table"
      {...handlers}
    >
      <div
        className="absolute"
        style={{ left: ox, top: oy, width: layout.w * k, height: layout.h * k }}
      >
        {layout.seats.map((s) => (
          <div
            key={s.seat}
            className="absolute rounded-xl"
            style={{
              left: s.x * k,
              top: s.y * k,
              width: s.w * k,
              height: s.h * k,
              background: `color-mix(in oklab, ${seatColor(s.seat)} 10%, transparent)`,
              outline: viewer === s.seat ? `2px solid ${seatColor(s.seat)}` : undefined,
            }}
          />
        ))}
        {layout.zones.map((pzn) => {
          const z = pzn.zone
          const { seat } = parseZoneKey(pzn.key)
          const count = state.zones[pzn.key]?.items?.length ?? 0
          const bgUrl = z.background?.assetId ? urls[z.background.assetId] : undefined
          const bgCard = z.background?.cardId ? faces[z.background.cardId]?.front : undefined
          const menu = z.kind === 'stack' || z.kind === 'row' || z.kind === 'grid'
          return (
            <div
              key={pzn.key}
              data-zone={pzn.key}
              className={cn(
                'absolute rounded-lg border-2 border-dashed border-white/35',
                dropZone === pzn.key && 'border-accent bg-accent/10',
                placing && 'border-white/70',
              )}
              style={{ left: pzn.x * k, top: pzn.y * k, width: pzn.w * k, height: pzn.h * k }}
            >
              {(bgUrl || bgCard) && (
                <img
                  src={bgUrl ?? bgCard ?? undefined}
                  alt=""
                  className="absolute inset-0 size-full rounded-lg object-cover"
                  draggable={false}
                />
              )}
              <div
                className="absolute bottom-full left-0 flex items-center gap-1 pb-0.5 font-medium whitespace-nowrap text-white/90"
                style={{ fontSize: label }}
              >
                {seat !== null && (
                  <span
                    className="inline-block size-2 shrink-0 rounded-full"
                    style={{ background: seatColor(seat) }}
                  />
                )}
                <span>{zoneLabel(pzn.key, z.name, z.kind === 'row' ? count : null)}</span>
                {menu && (
                  <ZoneMenu
                    zoneKey={pzn.key}
                    kind={z.kind}
                    onOpen={() => onOpenZone(pzn.key)}
                    locked={!!rules}
                  />
                )}
              </div>
              {z.kind === 'grid' &&
                Array.from({ length: slotCount(z) }, (_, i) => {
                  const r = slotRect(z, i, pzn.turned)
                  return (
                    <div
                      key={i}
                      data-slot-hint={hint?.slots.has(`${pzn.key}:${i}`) || undefined}
                      className={cn(
                        'absolute rounded-md border border-white/20',
                        hint?.slots.has(`${pzn.key}:${i}`) &&
                          'border-2 border-emerald-400 bg-emerald-400/15',
                      )}
                      style={{
                        left: (r.x + 1) * k,
                        top: (r.y + 1) * k,
                        width: (r.w - 2) * k,
                        height: (r.h - 2) * k,
                      }}
                    />
                  )
                })}
              {z.kind === 'stack' && count > 0 && (
                <span className="absolute right-1 bottom-1 z-[200] rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
                  {count}
                </span>
              )}
              {tokensAt(pzn.key).map((t) => {
                const def = setup.tokens.find((d) => d.id === t.tokenId)
                if (!def || !('zone' in t.at)) return null
                const px = Math.max(14, def.sizeMm * k)
                let x = t.at.x ?? 0
                let y = t.at.y ?? 0
                if (t.at.slot !== undefined) {
                  const r = slotRect(z, t.at.slot, pzn.turned)
                  x = r.x + 3 + def.sizeMm / 2
                  y = r.y + 3 + def.sizeMm / 2
                }
                return (
                  <span
                    key={t.id}
                    data-token={t.id}
                    className={cn(
                      'absolute z-[150] -translate-x-1/2 -translate-y-1/2',
                      selected?.kind === 'token' &&
                        selected.id === t.id &&
                        'rounded ring-4 ring-accent',
                    )}
                    style={{ left: x * k, top: y * k }}
                  >
                    <TokenShape def={def} color={tokenColor(t)} px={px} url={tokenUrl(def)} />
                  </span>
                )
              })}
            </div>
          )
        })}
        {turnBox && (
          <div
            className="pointer-events-none absolute rounded-2xl transition-all duration-300"
            style={{
              left: turnBox.x * k - 6,
              top: turnBox.y * k - 6,
              width: turnBox.w * k + 12,
              height: turnBox.h * k + 12,
              boxShadow: `0 0 0 3px ${seatColor(turnBox.seat)}, 0 0 28px ${seatColor(turnBox.seat)}`,
              zIndex: 5,
            }}
            data-testid="turn-glow"
            aria-hidden
          />
        )}
        {boxes.map((b) => {
          const piece = state.pieces[b.id]
          const z = setup.zones.find((x) => x.id === parseZoneKey(b.zone).zoneId)
          return (
            <PieceView
              key={b.id}
              box={b}
              k={k}
              piece={piece}
              face={faces[piece.cardId]}
              seen={seenBy(setup, state, b.id, viewer)}
              secretHere={z?.visibility === 'public'}
              color={seatColor(piece.owner)}
              selected={selected?.kind === 'piece' && selected.id === b.id}
              picked={state.last.picked === b.id || pickedIds.has(b.id)}
              hint={!!hint?.pieces.has(b.id)}
              stats={rules ? stats[b.id] : undefined}
              role={roles[b.id]}
              tokens={onPiece[b.id] ?? []}
              tokenDefs={setup.tokens}
              tokenColor={tokenColor}
              tokenUrl={tokenUrl}
              dragging={drag?.kind === 'piece' && drag.id === b.id}
              cue={cue?.glow[b.id]}
              dim={staged?.has(b.id)}
              lifted={lifted.has(b.id)}
            />
          )
        })}
        {intent &&
          (() => {
            const first = boxes.find((b) => intent.pieces.includes(b.id))
            const slotBox = (() => {
              if (!intent.slot) return null
              const pzn = layout.zones.find((z) => z.key === zoneKey('field', intent.slot!.seat))
              if (!pzn) return null
              const r = slotRect(pzn.zone, intent.slot.slot, pzn.turned)
              return { x: pzn.x + r.x, y: pzn.y + r.y, w: r.w, h: r.h }
            })()
            const at = slotBox && { x: slotBox.x + slotBox.w / 2, y: slotBox.y + slotBox.h / 2 }
            const p = first ? { x: first.cx, y: first.cy + first.h / 2 } : at
            if (!p) return null
            return (
              <>
                {slotBox && (
                  <div
                    className="pointer-events-none absolute z-[290] rounded-lg border-4 border-dashed border-yellow-300 motion-safe:animate-pulse"
                    style={{
                      left: slotBox.x * k,
                      top: slotBox.y * k,
                      width: slotBox.w * k,
                      height: slotBox.h * k,
                    }}
                  />
                )}
                <div
                  className="hs-pop pointer-events-none absolute z-[310] flex items-start gap-1"
                  style={{ left: p.x * k - 6, top: p.y * k - 10 }}
                  data-testid="intent-pointer"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-8 drop-shadow-[0_2px_3px_black] motion-safe:animate-bounce"
                  >
                    <path
                      d="M9 11V4.5a1.5 1.5 0 0 1 3 0V10l.01-1.5a1.5 1.5 0 0 1 3 0V11a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.9 6.5-6.5 6.5h-.6a6.5 6.5 0 0 1-5.2-2.6L3.1 16a1.6 1.6 0 0 1 2.4-2.1L9 16.5"
                      fill="#fde047"
                      stroke="#111"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span
                    className="mt-6 rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-black shadow-lg"
                    style={{ background: '#fde047' }}
                  >
                    {shown?.players[intent.seat].name} {intent.what}
                  </span>
                </div>
              </>
            )
          })()}
        {cue && cue.arrows.length > 0 && (
          <svg
            className="pointer-events-none absolute inset-0 z-[300] overflow-visible"
            width={layout.w * k}
            height={layout.h * k}
            aria-hidden
            data-testid="cue-arrows"
          >
            <defs>
              <marker
                id="cue-head"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto-start-reverse"
              >
                <path d="M0 0 L10 5 L0 10 z" fill="#67e8f9" />
              </marker>
            </defs>
            {cue.arrows.map((a, i) => {
              const f = endAt(a.from)
              const t = endAt(a.to)
              if (!f || !t) return null
              // Stop short of the card centres, so the heads sit on the cards.
              const len = Math.hypot(t.x - f.x, t.y - f.y) || 1
              const cut = Math.min(6, len / 4)
              const ux = (t.x - f.x) / len
              const uy = (t.y - f.y) / len
              return (
                <line
                  key={i}
                  x1={(f.x + ux * cut) * k}
                  y1={(f.y + uy * cut) * k}
                  x2={(t.x - ux * cut) * k}
                  y2={(t.y - uy * cut) * k}
                  stroke="#67e8f9"
                  strokeWidth={Math.max(3, 1.2 * k)}
                  strokeLinecap="round"
                  markerEnd="url(#cue-head)"
                  markerStart={a.both ? 'url(#cue-head)' : undefined}
                  className="drop-shadow"
                />
              )
            })}
          </svg>
        )}
      </div>
      {drag && (
        <div
          className="pointer-events-none fixed z-[300] -translate-x-1/2 -translate-y-1/2 opacity-90 shadow-2xl"
          style={{ left: drag.x, top: drag.y }}
        >
          {dragged ? (
            <div style={{ width: sizeOf(dragged.id).w * k, height: sizeOf(dragged.id).h * k }}>
              <PieceFace
                piece={dragged}
                face={faces[dragged.cardId]}
                seen={seenBy(setup, state, dragged.id, viewer)}
                color={seatColor(dragged.owner)}
              />
            </div>
          ) : (
            (() => {
              const t = state.tokens[drag.id]
              const def = t && setup.tokens.find((d) => d.id === t.tokenId)
              return def ? (
                <TokenShape
                  def={def}
                  color={tokenColor(t)}
                  px={Math.max(18, def.sizeMm * k)}
                  url={tokenUrl(def)}
                />
              ) : null
            })()
          )}
        </div>
      )}
      <ZoomBar zoom={view.zoom} onZoom={(f) => zoomBy(f)} onFit={fit} />
    </div>
  )
}

function ZoneMenu({
  zoneKey,
  kind,
  onOpen,
  locked,
}: {
  zoneKey: string
  kind: string
  onOpen: () => void
  /** The rules are on: only looking is allowed. */
  locked: boolean
}) {
  const act = usePlaytest((s) => s.act)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-zone-menu
          aria-label="Zone actions"
          className="pointer-events-auto -my-2 grid size-8 shrink-0 place-items-center rounded-md text-white/80 hover:bg-white/15 md:size-6"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={onOpen}>Show all cards</DropdownMenuItem>
        {kind !== 'grid' && !locked && (
          <DropdownMenuItem onSelect={() => act({ t: 'shuffle', zone: zoneKey })}>
            Shuffle
          </DropdownMenuItem>
        )}
        {!locked && (
          <DropdownMenuItem onSelect={() => act({ t: 'pick', zone: zoneKey })}>
            Pick a random card
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** How far each card behind the front one sits, as a share of the card's short side. */
const STACK_STEP = 0.24

/**
 * In combat each attack's cards gather as stacks on the field: the attack
 * stack on the position it comes from, the defense stack on the position it
 * defends, the front card on top and the others stepping up behind it.
 */
function stackOnField(boxes: PieceBox[], s: AsState, layout: TableLayout): PieceBox[] {
  if (!s.combat) return boxes
  const at = new Map<string, { cx: number; cy: number; z: number }>()
  const slotCentre = (seat: Seat, slot: number) => {
    const pz = layout.zones.find((z) => z.key === zoneKey('field', seat))
    if (!pz) return null
    const r = slotRect(pz.zone, slot, pz.turned)
    return { x: pz.x + r.x + r.w / 2, y: pz.y + r.y + r.h / 2 }
  }
  const gather = (seat: Seat, slot: number, cards: string[]) => {
    const field = s.players[seat].field
    const here = field[slot]?.card
    const order = here && cards.includes(here) ? [here, ...cards.filter((c) => c !== here)] : cards
    const c = slotCentre(seat, slot)
    if (!c || order.length < 2) return
    // Seat 1 sits at the top of the table: its stacks step down, towards the middle.
    const dir = seat === 0 ? 1 : -1
    order.forEach((card, k) => {
      const b = boxes.find((x) => x.id === pieceId(seat, card))
      if (!b) return
      const step = Math.min(b.w, b.h) * STACK_STEP * k
      at.set(b.id, { cx: c.x + step * 0.4, cy: c.y + dir * -step, z: 40 - k })
    })
  }
  for (const attacker of [0, 1] as Seat[]) {
    const lock = s.combat.stacks[attacker]
    if (!lock) continue
    gather(attacker, lock.origin, lock.attack)
    gather(other(attacker), lock.target, lock.defense)
  }
  return boxes.map((b) => {
    const p = at.get(b.id)
    return p ? { ...b, cx: p.cx, cy: p.cy, z: b.z + p.z } : b
  })
}
