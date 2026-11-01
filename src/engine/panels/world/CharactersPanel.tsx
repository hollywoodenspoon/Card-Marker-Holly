import { newId } from '@/core/model/ids'
import { Button } from '@/ui/components/ui/button'
import { Section } from '@/ui/components/fields'
import { askConfirm } from '@/ui/components/feedback'
import { Plus } from '@/ui/icons'
import { newCharacter, newPortraitTemplate } from '../../model/characters'
import { useGame } from '../../store/gameStore'
import { ListRow } from './ListRow'

/** Portrait templates (the layers) and the characters made from them. */
export function CharactersPanel() {
  const portraits = useGame((s) => s.game.portraits)
  const characters = useGame((s) => s.game.characters)
  const view = useGame((s) => s.view)
  const { commit, setView } = useGame.getState()
  const isOpen = (kind: string, id: string) => view.kind === kind && 'id' in view && view.id === id
  return (
    <div className="flex flex-col">
      <Section title="Characters">
        <p className="text-xs text-muted-foreground">
          People who talk in the dialogue box. Each picks a portrait template, an option and a
          colour per layer.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const g = useGame.getState().game
            const c = newCharacter(`Character ${g.characters.length + 1}`, g.portraits[0] ?? null)
            commit((d) => void d.characters.push(c))
            setView({ kind: 'character', id: c.id })
          }}
        >
          <Plus /> Character
        </Button>
        <ul className="flex flex-col gap-1" data-testid="characters">
          {characters.map((c) => (
            <ListRow
              key={c.id}
              name={c.name}
              icon={
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: c.nameColor }}
                />
              }
              detail={portraits.find((t) => t.id === c.template)?.name ?? 'No portrait'}
              active={isOpen('character', c.id)}
              onOpen={() => setView({ kind: 'character', id: c.id })}
              onDuplicate={() =>
                commit((d) => {
                  const copy = { ...structuredClone(c), id: newId(), name: `${c.name} copy` }
                  d.characters.push(copy)
                })
              }
              onDelete={async () => {
                if (
                  await askConfirm({
                    title: `Delete ${c.name}?`,
                    description: 'Lines they say show no name or portrait.',
                    okLabel: 'Delete',
                    danger: true,
                  })
                )
                  commit((d) => void (d.characters = d.characters.filter((x) => x.id !== c.id)))
              }}
            />
          ))}
        </ul>
      </Section>
      <Section title="Portrait templates">
        <p className="text-xs text-muted-foreground">
          The layers a portrait is made of (skin, eyes, hair…), their options, and the expressions
          that swap some of them.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const t = newPortraitTemplate(
              `Portrait ${useGame.getState().game.portraits.length + 1}`,
            )
            commit((d) => void d.portraits.push(t))
            setView({ kind: 'portrait', id: t.id })
          }}
        >
          <Plus /> Portrait template
        </Button>
        <ul className="flex flex-col gap-1" data-testid="portraits">
          {portraits.map((t) => (
            <ListRow
              key={t.id}
              name={t.name}
              detail={`${t.layers.length} layers · ${t.expressions.length} expressions`}
              active={isOpen('portrait', t.id)}
              onOpen={() => setView({ kind: 'portrait', id: t.id })}
              onDelete={async () => {
                if (
                  await askConfirm({
                    title: `Delete ${t.name}?`,
                    description: 'Characters using it lose their portrait.',
                    okLabel: 'Delete',
                    danger: true,
                  })
                )
                  commit((d) => void (d.portraits = d.portraits.filter((x) => x.id !== t.id)))
              }}
            />
          ))}
        </ul>
      </Section>
    </div>
  )
}
