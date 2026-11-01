import { ColorField, Section } from '@/ui/components/fields'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { newCharacter, type Character } from '../../model/characters'
import { usePortraitOf } from '../../portraits/render'
import { useGame } from '../../store/gameStore'
import { Checker } from './PortraitView'

/** A character in the centre: name, name colour, and an option and colour per layer. */
export function CharacterView({ character }: { character: Character }) {
  const portraits = useGame((s) => s.game.portraits)
  const commit = useGame((s) => s.commit)
  const t = portraits.find((x) => x.id === character.template) ?? null
  const edit = (recipe: (c: Character) => void, key?: string) =>
    commit((g) => {
      const c = g.characters.find((x) => x.id === character.id)
      if (c) recipe(c)
    }, key)
  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row" data-testid="character-view">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Character">
          <Input
            aria-label="Character name"
            value={character.name}
            onChange={(e) => edit((c) => void (c.name = e.target.value), `ch-name:${character.id}`)}
          />
          <ColorField
            label="Name colour"
            value={character.nameColor}
            onChange={(v) => v && edit((c) => void (c.nameColor = v), `ch-col:${character.id}`)}
          />
          <div className="flex flex-col gap-1">
            <Label>Portrait template</Label>
            <NativeSelect
              aria-label="Portrait template"
              value={character.template ?? ''}
              onChange={(e) => {
                const next = portraits.find((x) => x.id === e.target.value) ?? null
                edit((c) => {
                  c.template = next?.id ?? null
                  // Layers it doesn't have yet start as new.
                  const fresh = newCharacter(c.name, next).parts
                  for (const [id, p] of Object.entries(fresh)) c.parts[id] ??= p
                })
              }}
            >
              <option value="">No portrait</option>
              {portraits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        </Section>
        {t && (
          <Section title="Look">
            {t.layers.map((l) => {
              const part = character.parts[l.id] ?? { option: null, color: l.color }
              return (
                <div key={l.id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label>{l.name}</Label>
                    <NativeSelect
                      aria-label={l.name}
                      value={part.option ?? ''}
                      onChange={(e) =>
                        edit((c) => {
                          c.parts[l.id] = { ...part, option: e.target.value || null }
                        })
                      }
                    >
                      {!l.required && <option value="">None</option>}
                      {l.required && !part.option && <option value="">First option</option>}
                      {l.options.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  {l.recolor !== 'none' && (
                    <ColorField
                      label={`${l.name} colour`}
                      value={part.color}
                      onChange={(v) =>
                        v &&
                        edit((c) => {
                          c.parts[l.id] = { ...part, color: v }
                        }, `ch-lc:${character.id}:${l.id}`)
                      }
                    />
                  )}
                </div>
              )
            })}
          </Section>
        )}
      </div>
      {t && (
        <aside className="shrink-0 overflow-y-auto border-t p-3 lg:w-80 lg:border-t-0 lg:border-l">
          <h3 className="mb-2 text-sm font-semibold" style={{ color: character.nameColor }}>
            {character.name}
          </h3>
          <ul className="grid grid-cols-2 gap-2">
            {t.expressions.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 text-xs">
                <Expression character={character} expression={e.id} />
                {e.name}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}

function Expression({ character, expression }: { character: Character; expression: string }) {
  const t = useGame((s) => s.game.portraits.find((x) => x.id === character.template) ?? null)
  const url = usePortraitOf(t, character, expression)
  return (
    <Checker ratio={t ? t.width / Math.max(1, t.height) : 1}>
      {url && <img src={url} alt="" className="h-full w-full object-contain" />}
    </Checker>
  )
}
