import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { OpenedPack } from '../state'
import { useLine } from '../lines'
import { useRuntime } from '../runtime'
import { CardFace } from './CardFace'
import { useCardName } from './useCardName'
import { Panel, PlayerButton } from './Panel'

/** A booster opening: the cards face down, turned one at a time, foils shining. */
export function BoosterReveal({ pack, onDone }: { pack: OpenedPack; onDone: () => void }) {
  const booster = useRuntime((s) => s.game?.boosters.find((b) => b.id === pack.booster))
  const t = useLine()
  const [shown, setShown] = useState(0)
  const all = shown >= pack.cards.length
  const next = () => setShown((n) => Math.min(pack.cards.length, n + 1))
  return (
    <Panel
      title={`${booster?.name ?? 'Booster'}`}
      wide
      testId="player-booster"
      footer={
        <>
          <span className="flex-1 text-sm text-white/70">
            {all ? t('booster.done') : t('booster.tap')}
          </span>
          {!all && (
            <PlayerButton onClick={() => setShown(pack.cards.length)}>{t('booster.showAll')}</PlayerButton>
          )}
          <PlayerButton primary onClick={all ? onDone : next} data-testid="booster-next">
            {all ? t('booster.close') : t('booster.next')}
          </PlayerButton>
        </>
      }
    >
      <ul className="flex flex-wrap justify-center gap-4">
        {pack.cards.map((c, i) => (
          <li key={i} className="flex w-36 flex-col items-center gap-1.5 sm:w-44">
            <button
              type="button"
              aria-label={i < shown ? undefined : `Turn card ${i + 1}`}
              disabled={i !== shown}
              onClick={next}
              className="w-full"
            >
              <CardFace
                id={c.id}
                foil={c.foil}
                back={i >= shown}
                className={cn(i < shown && 'hs-flip', i === shown && 'ring-2 ring-accent')}
              />
            </button>
            {i < shown && (
              <PulledLabel id={c.id} rarity={c.rarity} booster={pack.booster} foil={c.foil} />
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function PulledLabel({
  id,
  rarity,
  booster,
  foil,
}: {
  id: string
  rarity: string
  booster: string
  foil: boolean
}) {
  const name = useCardName(id)
  const r = useRuntime(
    (s) =>
      s.game?.boosters.find((b) => b.id === booster)?.rarities.find((x) => x.id === rarity)?.name,
  )
  return (
    <span className="hs-pop text-center text-xs leading-tight">
      <span className="block font-medium">{name}</span>
      <span className={cn('text-white/70', foil && 'text-amber-300')}>{r}</span>
    </span>
  )
}
