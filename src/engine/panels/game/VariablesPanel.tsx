import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, NativeSelect } from '@/ui/components/ui/input'
import { Plus, Trash2 } from '@/ui/icons'
import { newVariable, type VarDef } from '../../model/game'
import { useGame } from '../../store/gameStore'

/** Named flags (on/off) and numbers, with the value each starts at. */
export function VariablesPanel() {
  const vars = useGame((s) => s.game.variables)
  const commit = useGame((s) => s.commit)
  const edit = (id: string, recipe: (v: VarDef) => void, key?: string) =>
    commit((g) => {
      const v = g.variables.find((x) => x.id === id)
      if (v) recipe(v)
    }, key)
  const add = (kind: VarDef['kind']) =>
    commit((g) => {
      const n = g.variables.filter((v) => v.kind === kind).length + 1
      g.variables.push(newVariable(kind === 'flag' ? `Flag ${n}` : `Number ${n}`, kind))
    })
  return (
    <div className="flex flex-col gap-3 p-3">
      <p className="text-xs text-muted-foreground">
        Cause and Effect reads and changes these: “if Has key is on”, “add 10 to Gold”.
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => add('flag')}>
          <Plus /> Flag
        </Button>
        <Button size="sm" variant="outline" onClick={() => add('number')}>
          <Plus /> Number
        </Button>
      </div>
      <ul className="flex flex-col gap-1.5" data-testid="variables">
        {vars.map((v) => (
          <li key={v.id} className="flex items-center gap-1">
            <Input
              aria-label="Variable name"
              className="h-9 min-w-0 flex-1 md:h-8"
              value={v.name}
              onChange={(e) => edit(v.id, (x) => void (x.name = e.target.value), `var:${v.id}`)}
            />
            {v.kind === 'flag' ? (
              <NativeSelect
                aria-label={`${v.name} starts`}
                className="h-9 w-20 text-xs md:h-8"
                value={v.initial ? 'on' : 'off'}
                onChange={(e) => edit(v.id, (x) => void (x.initial = e.target.value === 'on'))}
              >
                <option value="off">Off</option>
                <option value="on">On</option>
              </NativeSelect>
            ) : (
              <Input
                type="number"
                aria-label={`${v.name} starts at`}
                className="h-9 w-20 text-xs md:h-8"
                value={Number(v.initial)}
                onChange={(e) =>
                  edit(v.id, (x) => void (x.initial = Number(e.target.value) || 0), `vi:${v.id}`)
                }
              />
            )}
            <IconButton
              label={`Delete ${v.name}`}
              onClick={() =>
                commit((g) => void (g.variables = g.variables.filter((x) => x.id !== v.id)))
              }
            >
              <Trash2 />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  )
}
