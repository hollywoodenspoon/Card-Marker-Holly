import { Maximize2, X } from '@/ui/icons'
import { abilityText } from '@/adventure/cards'
import { implemented, unreadParts } from '@/adventure/effects/registry'
import { statsAt } from '@/adventure/stats'
import { parsePieceId } from '@/adventure/table'
import { cn } from '@/lib/cn'
import { seenBy } from '@/playtest/actions'
import { IconButton } from '@/ui/components/ui/button'
import { PieceFace } from './Piece'
import { useFaces } from './packContext'
import { shownRules, usePlaytest } from './usePlaytest'

/**
 * The last card tapped, large enough to read, in a small window over the
 * table (as in the Yu-Gi-Oh games). It doesn't block the table: the tap that
 * opened it still makes its move.
 */
export function CardPreview({
  pieceId,
  phone,
  onClose,
  onEnlarge,
}: {
  pieceId: string | null
  phone: boolean
  onClose: () => void
  onEnlarge: (pieceId: string) => void
}) {
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const viewer = usePlaytest((s) => s.viewer)
  const rules = usePlaytest(shownRules)
  const faces = useFaces()
  const p = pieceId && state ? state.pieces[pieceId] : undefined
  if (!p || !setup || !state || seenBy(setup, state, p.id, viewer) === 'back') return null
  const f = faces[p.cardId]
  const card = rules?.cards[p.cardId]
  const at = parsePieceId(p.id)
  const slot = at && rules ? rules.players[at.seat].field.findIndex((x) => x.card === at.card) : -1
  const now =
    card && at && rules && slot >= 0 && rules.players[at.seat].field[slot].faceUp
      ? statsAt(rules, at.seat, slot)
      : null
  const stat = (label: string, printed: number, value = printed) => (
    <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums">
      {label} {value}
      {value !== printed && <span className="text-muted-foreground"> ({printed})</span>}
    </span>
  )
  const picture = (
    <div
      className={cn('overflow-hidden rounded-md', phone ? 'h-full shrink-0' : 'mx-auto w-full')}
      style={{
        aspectRatio: f ? `${f.w} / ${f.h}` : '63 / 88',
        maxHeight: phone ? undefined : '44dvh',
      }}
    >
      <PieceFace piece={p} face={f} seen="face" color={setup.seats[p.owner]?.color ?? '#64748b'} />
    </div>
  )
  const title = (
    <div className="flex items-center gap-1">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{card?.name ?? p.name}</span>
      <IconButton label="Enlarge" onClick={() => onEnlarge(p.id)}>
        <Maximize2 />
      </IconButton>
      <IconButton label="Close the preview" onClick={onClose}>
        <X />
      </IconButton>
    </div>
  )
  const details = card && (
    <>
      <div className="flex flex-wrap items-center gap-1 text-xs font-medium">
        {card.type && <span className="text-muted-foreground">{card.type}</span>}
        {stat('A', card.a, now?.a)}
        {stat('D', card.d, now?.d)}
        {stat('FS', card.fs)}
        <span className="text-muted-foreground tabular-nums">Fate {card.fate}</span>
      </div>
      {card.ability && (
        <p className="min-h-0 overflow-auto text-xs leading-snug" data-testid="preview-ability">
          {abilityText(card.ability)}
          {!implemented(card) && (
            <span className="block text-amber-600 dark:text-amber-400">
              The rules engine can't read “{unreadParts(card).join('”, “')}”: it plays with its
              stats.
            </span>
          )}
        </p>
      )}
    </>
  )
  // A phone: a strip along the bottom of the table, the picture beside the text.
  if (phone)
    return (
      <aside
        className="absolute inset-x-2 bottom-2 z-[360] flex h-44 gap-2 rounded-xl border bg-panel/95 p-2 shadow-xl backdrop-blur"
        aria-label={`Card preview: ${p.name}`}
        data-testid="card-preview"
      >
        {picture}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {title}
          {details}
        </div>
      </aside>
    )
  return (
    <aside
      className="absolute top-16 left-3 z-[360] flex w-64 flex-col gap-1.5 rounded-xl border bg-panel/95 p-2 shadow-xl backdrop-blur"
      aria-label={`Card preview: ${p.name}`}
      data-testid="card-preview"
    >
      {title}
      {picture}
      {details && <div className="flex max-h-40 flex-col gap-1.5">{details}</div>}
    </aside>
  )
}
