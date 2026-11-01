import { useMemo, useState } from 'react'
import { newId } from '@/core/model/ids'
import { randomSeed } from '@/playtest/rng'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Plus, RotateCcw, Sparkles, Trash2 } from '@/ui/icons'
import { useGameCards } from '../../cards/gameCards'
import { openBooster, rarityPercents, type Pulled } from '../../economy/booster'
import { DEFAULT_RARITIES, isAce, type Booster, type Rarity } from '../../model/economy'
import { useGame } from '../../store/gameStore'
import { CardFace } from '../../runtime/player/CardFace'
import { ImageField } from './ImageField'

/** A booster in the centre: price, size, pool, rarities, and a test opening. */
export function BoosterView({ booster }: { booster: Booster }) {
  const game = useGame((s) => s.game)
  const commit = useGame((s) => s.commit)
  const cards = useGameCards((s) => s.merged?.pack.info.cards)
  const [test, setTest] = useState<Pulled[] | null>(null)
  const edit = (recipe: (b: Booster) => void, key?: string) =>
    commit((g) => {
      const b = g.boosters.find((x) => x.id === booster.id)
      if (b) recipe(b)
    }, key)
  const editRarity = (i: number, recipe: (r: Rarity) => void, key?: string) =>
    edit((b) => recipe(b.rarities[i]), key)
  const pct = rarityPercents(booster)
  const pool = useMemo(() => {
    const only = booster.pool ? game.decks.find((d) => d.id === booster.pool)?.counts : null
    return (cards ?? [])
      .filter((c) => !only || only[c.id])
      .map((c) => ({ id: c.id, ace: isAce(c.fields, game.economy) }))
  }, [cards, booster.pool, game.decks, game.economy])
  const aces = pool.filter((c) => c.ace).length
  return (
    <div className="h-full overflow-y-auto" data-testid="booster-view">
      <Section title="Booster">
        <Input
          aria-label="Booster name"
          value={booster.name}
          onChange={(e) => edit((b) => void (b.name = e.target.value), `bn:${booster.id}`)}
        />
        <ImageField
          label="Pack picture"
          value={booster.image}
          onChange={(r) => edit((b) => void (b.image = r))}
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="b-price">Price</Label>
            <Input
              id="b-price"
              type="number"
              min={0}
              value={booster.price}
              onChange={(e) =>
                edit(
                  (b) => void (b.price = Math.max(0, Number(e.target.value) || 0)),
                  `bp:${booster.id}`,
                )
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="b-size">Cards per pack</Label>
            <Input
              id="b-size"
              type="number"
              min={1}
              max={30}
              value={booster.size}
              onChange={(e) =>
                edit(
                  (b) => void (b.size = Math.max(1, Math.min(30, Number(e.target.value) || 1))),
                  `bs:${booster.id}`,
                )
              }
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="b-pool">Cards it holds</Label>
          <NativeSelect
            id="b-pool"
            value={booster.pool ?? ''}
            onChange={(e) => edit((b) => void (b.pool = e.target.value || null))}
          >
            <option value="">All the game’s cards</option>
            {game.decks.map((d) => (
              <option key={d.id} value={d.id}>
                The cards in {d.name}
              </option>
            ))}
          </NativeSelect>
          <p className="text-xs text-muted-foreground">
            {pool.length} cards, {aces} of them Aces
            {!game.economy.aceField && ' (set the Ace field in Items)'}.
          </p>
        </div>
      </Section>
      <Section
        title="Rarities"
        action={
          <IconButton
            label="Back to the usual rarities"
            size="icon-sm"
            onClick={() => edit((b) => void (b.rarities = DEFAULT_RARITIES()))}
          >
            <RotateCcw />
          </IconButton>
        }
      >
        <p className="text-xs text-muted-foreground">
          Each card in a pack rolls one of these by chance.
        </p>
        <ul className="flex flex-col gap-1.5">
          {booster.rarities.map((r, i) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm"
            >
              <Input
                aria-label="Rarity name"
                className="h-9 w-36 md:h-8"
                value={r.name}
                onChange={(e) => editRarity(i, (x) => void (x.name = e.target.value), `rn:${r.id}`)}
              />
              <NativeSelect
                aria-label={`${r.name} cards`}
                className="h-9 w-28 md:h-8"
                value={r.ace ? 'ace' : 'non'}
                onChange={(e) => editRarity(i, (x) => void (x.ace = e.target.value === 'ace'))}
              >
                <option value="non">non-Ace</option>
                <option value="ace">Ace</option>
              </NativeSelect>
              <label className="flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  checked={r.foil}
                  onChange={(e) => editRarity(i, (x) => void (x.foil = e.target.checked))}
                />
                Foil
              </label>
              <Input
                type="number"
                min={0}
                step="any"
                aria-label={`${r.name} chance`}
                className="h-9 w-20 md:h-8"
                value={r.chance}
                onChange={(e) =>
                  editRarity(
                    i,
                    (x) => void (x.chance = Math.max(0, Number(e.target.value) || 0)),
                    `rc:${r.id}`,
                  )
                }
              />
              <span className="w-12 text-xs text-muted-foreground tabular-nums">
                {Math.round((pct[r.id] ?? 0) * 10) / 10}%
              </span>
              <IconButton
                label={`Delete ${r.name}`}
                size="icon-sm"
                disabled={booster.rarities.length <= 1}
                onClick={() => edit((b) => void b.rarities.splice(i, 1))}
              >
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="ghost"
          className="self-start"
          onClick={() =>
            edit(
              (b) =>
                void b.rarities.push({
                  id: newId(),
                  name: 'New rarity',
                  ace: false,
                  foil: false,
                  chance: 1,
                }),
            )
          }
        >
          <Plus /> Rarity
        </Button>
      </Section>
      <Section title="Try it">
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          disabled={!pool.length}
          onClick={() => setTest(openBooster(booster, pool, randomSeed()).cards)}
        >
          <Sparkles /> Open a test pack
        </Button>
        {test && (
          <ul className="flex flex-wrap gap-3 rounded-lg bg-neutral-900 p-3 text-white">
            {test.map((c, i) => (
              <li key={i} className="flex w-32 flex-col gap-1 text-xs">
                <CardFace id={c.id} foil={c.foil} />
                {booster.rarities.find((r) => r.id === c.rarity)?.name}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  )
}
