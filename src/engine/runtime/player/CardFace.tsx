import { cn } from '@/lib/cn'
import { useGameCards } from '../../cards/gameCards'

/** A card's picture from the game's cards, with the moving shine when it's foil. */
export function CardFace({
  id,
  foil,
  back,
  className,
}: {
  id: string
  foil?: boolean
  /** Show the card's back (or a plain back when it has none). */
  back?: boolean
  className?: string
}) {
  const face = useGameCards((s) => s.open?.faces[id])
  const name = useGameCards((s) => s.merged?.pack.info.cards.find((c) => c.id === id)?.name ?? '')
  const src = back ? face?.back : face?.front
  return (
    <div
      className={cn(
        'relative aspect-[63/88] overflow-hidden rounded-lg bg-neutral-800 shadow-lg',
        className,
      )}
      style={face ? { aspectRatio: `${face.w} / ${face.h}` } : undefined}
    >
      {src ? (
        <img src={src} alt={back ? 'Card back' : name} className="h-full w-full object-cover" />
      ) : (
        <div
          className={cn(
            'grid h-full w-full place-items-center p-2 text-center text-xs',
            back ? 'bg-gradient-to-br from-indigo-900 to-neutral-900' : 'text-white/80',
          )}
        >
          {back ? '' : name}
        </div>
      )}
      {foil && !back && <div className="hs-foil" aria-hidden />}
    </div>
  )
}
