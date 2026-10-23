import { EyeOff } from '@/ui/icons'
import { memo, useState } from 'react'
import { cn } from '@/lib/cn'
import type { Seen } from '@/playtest/actions'
import type { PieceBox } from '@/playtest/geometry'
import type { TokenDef } from '@/playtest/setup'
import type { Piece, TokenInst } from '@/playtest/state'
import { CUE_RING, type CueKind } from './cues'
import type { Face } from './packContext'

/** A card back for cards without a back template: neutral, in the owner's colour. */
export function PlainBack({ color }: { color: string }) {
  return (
    <div
      className="size-full rounded-[6%] border-2 border-white/70"
      style={{
        background: `repeating-linear-gradient(45deg, ${color}, ${color} 6px, color-mix(in oklab, ${color} 70%, black) 6px, color-mix(in oklab, ${color} 70%, black) 12px)`,
      }}
    />
  )
}

/** The picture of a piece as the viewer may see it. */
export function PieceFace({
  piece,
  face,
  seen,
  color,
}: {
  piece: Piece
  face: Face | undefined
  seen: Seen
  color: string
}) {
  if (seen === 'back')
    return face?.back ? (
      <img
        src={face.back}
        alt="Card back"
        className="size-full rounded-[4%] object-cover"
        draggable={false}
      />
    ) : (
      <PlainBack color={color} />
    )
  if (face?.front)
    return (
      <img
        src={face.front}
        alt={piece.name}
        className="size-full rounded-[4%] object-cover"
        draggable={false}
      />
    )
  return (
    <div className="grid size-full place-items-center rounded-[4%] border bg-white p-1 text-center text-[10px] leading-tight text-neutral-800">
      {face ? piece.name : ''}
    </div>
  )
}

export const TokenShape = memo(function TokenShape({
  def,
  color,
  px,
  url,
}: {
  def: TokenDef
  color: string
  px: number
  url?: string
}) {
  const style = { width: px, height: px }
  if (url)
    return <img src={url} alt="" style={style} className="object-contain" draggable={false} />
  const common = 'shadow-md ring-2 ring-white/80'
  if (def.shape === 'disc')
    return (
      <span className={cn('block rounded-full', common)} style={{ ...style, background: color }} />
    )
  if (def.shape === 'cube')
    return (
      <span className={cn('block rounded-[18%]', common)} style={{ ...style, background: color }} />
    )
  if (def.shape === 'star')
    return (
      <svg viewBox="0 0 24 24" style={style} className="drop-shadow-md">
        <path
          d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
    )
  return (
    <svg viewBox="0 0 24 24" style={style} className="drop-shadow-md">
      <circle cx="12" cy="6.5" r="4.5" fill={color} stroke="white" strokeWidth="1.5" />
      <path d="M5 22c0-6 3-9.5 7-9.5s7 3.5 7 9.5z" fill={color} stroke="white" strokeWidth="1.5" />
    </svg>
  )
})

/** A card's values to show on it, and which ones its abilities changed. */
export interface PieceStats {
  a: number
  d: number
  fs: number
  /** Up or down from print (Inherent bonuses, a combat lock). */
  da?: number
  dd?: number
}

/**
 * Attack, Defense and Fighting Spirit chips where the card prints them: Attack
 * on the middle of the left edge, Defense on the right, Fighting Spirit on top.
 */
export function StatChips({ stats, px }: { stats: PieceStats; px: number }) {
  const size = Math.max(9, Math.min(14, px))
  const chip = (delta: number | undefined, base: string, where: string) =>
    cn(
      'pointer-events-none absolute rounded px-1 font-bold tabular-nums leading-tight text-white shadow',
      base,
      where,
      delta && delta > 0 && 'ring-1 ring-white',
      delta && delta < 0 && 'opacity-80 line-through decoration-white/60',
    )
  return (
    <span className="contents" style={{ fontSize: size }} data-testid="piece-stats">
      <span
        className={chip(stats.da, 'bg-red-600/90', 'top-1/2 left-0 -translate-y-1/2')}
        style={{ fontSize: size }}
        title="Attack"
      >
        A{stats.a}
      </span>
      <span
        className={chip(stats.dd, 'bg-emerald-600/90', 'top-1/2 right-0 -translate-y-1/2')}
        style={{ fontSize: size }}
        title="Defense"
      >
        D{stats.d}
      </span>
      <span
        className={chip(undefined, 'bg-amber-500/90 text-black', 'top-0 left-1/2 -translate-x-1/2')}
        style={{ fontSize: size }}
        title="Fighting Spirit"
      >
        FS{stats.fs}
      </span>
    </span>
  )
}

/** The lasting glow of a card that attacks or defends this round. */
const ROLE_RING = { attack: 'ring-4 ring-red-500', defend: 'ring-4 ring-emerald-500' } as const

/** One card on the table. Positions are table mm × `k` (px per mm). */
export const PieceView = memo(function PieceView({
  box,
  k,
  piece,
  face,
  seen,
  secretHere,
  color,
  selected,
  picked,
  hint,
  stats,
  role,
  tokens,
  tokenDefs,
  tokenColor,
  tokenUrl,
  dragging,
  cue,
  dim,
}: {
  box: PieceBox
  k: number
  piece: Piece
  face: Face | undefined
  seen: Seen
  /** The zone shows peeked cards dimmed (a face-down card on the table, not a hand). */
  secretHere: boolean
  color: string
  selected: boolean
  picked: boolean
  /** The rules let the player to act use it now. */
  hint?: boolean
  /** Its Attack, Defense and Fighting Spirit, shown on the card. */
  stats?: PieceStats
  /** It attacks or defends this round: a lasting red or green glow. */
  role?: 'attack' | 'defend'
  tokens: TokenInst[]
  tokenDefs: TokenDef[]
  tokenColor: (t: TokenInst) => string
  tokenUrl: (def: TokenDef) => string | undefined
  dragging: boolean
  /** What just happened to it (while actions are shown). */
  cue?: CueKind
  /** It's drawn on the combat stage: faint here. */
  dim?: boolean
}) {
  const w = box.w * k
  const h = box.h * k
  // A card that turns face up while on screen flips over (not every card at load).
  const [wasBack] = useState(seen === 'back')
  return (
    <div
      data-piece={piece.id}
      role="button"
      tabIndex={-1}
      aria-label={seen === 'back' ? 'Face-down card' : piece.name}
      aria-pressed={selected}
      data-hint={hint || undefined}
      data-cue={cue}
      className={cn(
        'absolute touch-none rounded-[5%] shadow-md transition-[left,top,transform,box-shadow] duration-300 ease-out select-none motion-reduce:transition-none',
        selected && 'ring-4 ring-accent',
        picked && !selected && 'ring-4 ring-amber-400',
        role && !selected && !picked && ROLE_RING[role],
        hint && !selected && !picked && 'ring-4 ring-emerald-400',
        cue && !selected && cn('ring-4 motion-safe:animate-pulse', CUE_RING[cue]),
        (dragging || dim) && 'opacity-40',
      )}
      style={{
        left: (box.cx - box.w / 2) * k,
        top: (box.cy - box.h / 2) * k,
        width: w,
        height: h,
        transform: `rotate(${box.rotation}deg)`,
        zIndex: 10 + box.z + (selected ? 100 : 0),
      }}
    >
      <div
        key={seen === 'back' ? 'back' : 'face'}
        className={cn(
          'size-full',
          seen === 'peek' && secretHere && 'opacity-60',
          wasBack && seen !== 'back' && 'hs-flip',
        )}
      >
        <PieceFace piece={piece} face={face} seen={seen} color={color} />
      </div>
      {seen === 'peek' && (
        <span
          className="absolute top-1 left-1 grid size-5 place-items-center rounded-full bg-black/70 text-white"
          title="Face down: only its owner knows it"
        >
          <EyeOff className="size-3" />
        </span>
      )}
      {stats && seen !== 'back' && <StatChips stats={stats} px={Math.min(w, h) * 0.13} />}
      {tokens.length > 0 && (
        <span className="pointer-events-none absolute -top-2 -right-2 flex gap-0.5">
          {tokens.map((t) => {
            const def = tokenDefs.find((d) => d.id === t.tokenId)
            return def ? (
              <span key={t.id} data-token={t.id} className="pointer-events-auto">
                <TokenShape
                  def={def}
                  color={tokenColor(t)}
                  px={Math.max(14, def.sizeMm * k)}
                  url={tokenUrl(def)}
                />
              </span>
            ) : null
          })}
        </span>
      )}
    </div>
  )
})
