import { abilityText } from '@/adventure/cards'
import { implemented } from '@/adventure/effects/registry'
import { seenBy } from '@/playtest/actions'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { PieceFace } from './Piece'
import { useFaces } from './packContext'
import { usePlaytest } from './usePlaytest'

/** One card as large as the screen allows, to read its text. */
export function CardZoom({ pieceId, onClose }: { pieceId: string | null; onClose: () => void }) {
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const viewer = usePlaytest((s) => s.viewer)
  const rules = usePlaytest((s) => s.rules)
  const faces = useFaces()
  const p = pieceId && state ? state.pieces[pieceId] : undefined
  const f = p && faces[p.cardId]
  const card = p && rules?.cards[p.cardId]
  const visible = !!p && !!setup && !!state && seenBy(setup, state, p.id, viewer) !== 'back'
  return (
    <Dialog open={!!p} onOpenChange={(o) => !o && onClose()}>
      {p && setup && state && (
        <DialogContent title={p.name} className="max-w-[min(90vw,32rem)]">
          <div
            className="mx-auto w-full"
            style={{ aspectRatio: f ? `${f.w} / ${f.h}` : '63 / 88', maxHeight: '70dvh' }}
          >
            <PieceFace
              piece={p}
              face={f}
              seen={seenBy(setup, state, p.id, viewer) === 'back' ? 'back' : 'face'}
              color={setup.seats[p.owner]?.color ?? '#64748b'}
            />
          </div>
          {card && visible && card.ability && (
            <p className="text-sm" data-testid="zoom-ability">
              {abilityText(card.ability)}
              {!implemented(card.code) && (
                <span className="block text-xs text-amber-600 dark:text-amber-400">
                  This ability isn't in the rules engine yet: the card plays with its stats.
                </span>
              )}
            </p>
          )}
        </DialogContent>
      )}
    </Dialog>
  )
}
