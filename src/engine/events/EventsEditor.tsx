import { useMemo } from 'react'
import { newId } from '@/core/model/ids'
import { cn } from '@/lib/cn'
import { Button, IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input, NativeSelect } from '@/ui/components/ui/input'
import { askText } from '@/ui/components/feedback'
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GitBranch,
  MoreHorizontal,
  Plus,
  Save,
  Shuffle,
  Split,
  Trash2,
  Zap,
} from '@/ui/icons'
import {
  choiceStep,
  cloneSteps,
  effect,
  findStep,
  ifStep,
  newEvent,
  randomStep,
  type Args,
  type GameEvent,
  type Step,
} from '../model/events'
import { useGame } from '../store/gameStore'
import { defaultArgs, piece, piecesOf, type Attach, type FieldDef, type PieceDef } from './pieces'

/** What pickers can choose from: the open game's things, by id and name. */
function useChoices() {
  const game = useGame((s) => s.game)
  return useMemo(() => {
    const objects: { id: string; name: string }[] = []
    for (const s of game.scenes)
      if (s.kind === 'picture')
        for (const o of [...s.objects, ...s.areas])
          objects.push({ id: o.id, name: `${o.name} (${s.name})` })
    return {
      scene: game.scenes.map((s) => ({ id: s.id, name: s.name })),
      flag: game.variables.filter((v) => v.kind === 'flag'),
      number: game.variables.filter((v) => v.kind === 'number'),
      deck: game.decks.map((d) => ({ id: d.id, name: d.name })),
      recipe: game.recipes.map((r) => ({ id: r.id, name: r.name })),
      object: objects,
    }
  }, [game])
}
type Choices = ReturnType<typeof useChoices>

type EditEvents = (recipe: (events: GameEvent[]) => void) => void

/**
 * Cause and Effect for one thing (a click area, an object, a scene, the game): its
 * events as sentences. Each event is a cause and a list of steps; steps are
 * effects or branches (if/otherwise, a choice, a random pick) holding more steps.
 */
export function EventsEditor({
  events,
  attach,
  onChange,
}: {
  events: GameEvent[]
  attach: Attach
  onChange: EditEvents
}) {
  const causes = piecesOf('cause').filter((c) => c.attach.includes(attach))
  const choices = useChoices()
  return (
    <div className="flex flex-col gap-3" data-testid="events-editor">
      {events.map((ev) => (
        <EventCard key={ev.id} ev={ev} causes={causes} choices={choices} onChange={onChange} />
      ))}
      {causes.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            onChange((list) => {
              list.push(newEvent({ piece: causes[0].id, args: defaultArgs(causes[0]) }))
            })
          }
        >
          <Zap /> Add cause and effect
        </Button>
      )}
    </div>
  )
}

function EventCard({
  ev,
  causes,
  choices,
  onChange,
}: {
  ev: GameEvent
  causes: PieceDef[]
  choices: Choices
  onChange: EditEvents
}) {
  const edit = (recipe: (e: GameEvent) => void) =>
    onChange((list) => {
      const e = list.find((x) => x.id === ev.id)
      if (e) recipe(e)
    })
  const editSteps = (recipe: (steps: Step[]) => void) => edit((e) => recipe(e.steps))
  return (
    <section className="rounded-lg border bg-background/40 p-2" aria-label="Cause and effect">
      <div className="flex items-center gap-1.5">
        <Zap className="size-4 shrink-0 text-accent" />
        {causes.length > 1 ? (
          <NativeSelect
            aria-label="Cause"
            className="h-8 min-w-0 flex-1 text-sm font-medium"
            value={ev.cause.piece}
            onChange={(e) =>
              edit((x) => {
                const def = piece(e.target.value)
                x.cause = { piece: e.target.value, args: def ? defaultArgs(def) : {} }
              })
            }
          >
            {causes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.sentence}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <span className="min-w-0 flex-1 text-sm font-medium">
            {piece(ev.cause.piece)?.sentence ?? ev.cause.piece}
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="Cause and effect options" size="icon-sm">
              <MoreHorizontal />
            </IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={async () => {
                const name = await askText({
                  title: 'Save as recipe',
                  label: 'Recipe name',
                  okLabel: 'Save',
                })
                if (!name?.trim()) return
                useGame.getState().commit((g) => {
                  g.recipes.push({ id: newId(), name: name.trim(), steps: cloneSteps(ev.steps) })
                })
              }}
            >
              <Save /> Save steps as a recipe…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              danger
              onSelect={() =>
                onChange((list) => {
                  const i = list.findIndex((x) => x.id === ev.id)
                  if (i >= 0) list.splice(i, 1)
                })
              }
            >
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <StepList steps={ev.steps} choices={choices} editSteps={editSteps} depth={0} />
    </section>
  )
}

type EditSteps = (recipe: (steps: Step[]) => void) => void

function StepList({
  steps,
  choices,
  editSteps,
  depth,
  listOf,
}: {
  steps: Step[]
  choices: Choices
  editSteps: EditSteps
  depth: number
  /** Finds this list inside the event's steps (nested lists). */
  listOf?: (root: Step[]) => Step[] | null
}) {
  const here = (recipe: (list: Step[]) => void) =>
    editSteps((root) => {
      const list = listOf ? listOf(root) : root
      if (list) recipe(list)
    })
  return (
    <div
      className={cn('mt-1.5 flex flex-col gap-1', depth > 0 && 'border-l-2 border-accent/30 pl-2')}
    >
      {steps.map((s, i) => (
        <StepRow
          key={s.id}
          step={s}
          first={i === 0}
          last={i === steps.length - 1}
          choices={choices}
          editSteps={editSteps}
          depth={depth}
          onMove={(d) =>
            here((list) => {
              const j = i + d
              if (j < 0 || j >= list.length) return
              ;[list[i], list[j]] = [list[j], list[i]]
            })
          }
          onDuplicate={() => here((list) => void list.splice(i + 1, 0, ...cloneSteps([list[i]])))}
          onDelete={() => here((list) => void list.splice(i, 1))}
        />
      ))}
      <AddStep choices={choices} onAdd={(s) => here((list) => void list.push(s))} />
    </div>
  )
}

function StepRow({
  step,
  first,
  last,
  choices,
  editSteps,
  depth,
  onMove,
  onDuplicate,
  onDelete,
}: {
  step: Step
  first: boolean
  last: boolean
  choices: Choices
  editSteps: EditSteps
  depth: number
  onMove: (d: -1 | 1) => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  // Edits find this step by id anywhere in the tree, so nesting needs no paths.
  const editThis = (recipe: (s: Step) => void) =>
    editSteps((root) => {
      const hit = findStep(root, step.id)
      if (hit) recipe(hit.list[hit.index])
    })
  const nested = (pick: (s: Step) => Step[] | undefined) => (root: Step[]) => {
    const hit = findStep(root, step.id)
    return hit ? (pick(hit.list[hit.index]) ?? null) : null
  }
  const tools = (
    <span className="ml-auto flex shrink-0 items-center opacity-70 group-hover:opacity-100">
      <IconButton label="Move up" size="icon-sm" disabled={first} onClick={() => onMove(-1)}>
        <ArrowUp />
      </IconButton>
      <IconButton label="Move down" size="icon-sm" disabled={last} onClick={() => onMove(1)}>
        <ArrowDown />
      </IconButton>
      <IconButton label="Duplicate" size="icon-sm" onClick={onDuplicate}>
        <Copy />
      </IconButton>
      <IconButton label="Delete" size="icon-sm" onClick={onDelete}>
        <Trash2 />
      </IconButton>
    </span>
  )

  if (step.kind === 'effect') {
    const def = piece(step.piece)
    return (
      <div
        className="group flex flex-wrap items-center gap-1 rounded-md px-1 py-0.5 text-sm hover:bg-muted/60"
        data-testid="step"
      >
        <Sentence
          def={def}
          args={step.args}
          choices={choices}
          onArg={(k, v) => editThis((s) => s.kind === 'effect' && void (s.args[k] = v))}
          fallback={`(missing piece: ${step.piece})`}
        />
        {tools}
      </div>
    )
  }

  if (step.kind === 'if') {
    const def = piece(step.condition.piece)
    const conditions = piecesOf('condition')
    return (
      <div className="group rounded-md bg-muted/30 px-1 py-1 text-sm" data-testid="step-if">
        <div className="flex flex-wrap items-center gap-1">
          <GitBranch className="size-3.5 text-accent" />
          <span className="font-medium">If</span>
          <NativeSelect
            aria-label="Condition"
            className="h-7 w-auto text-xs"
            value={step.condition.piece}
            onChange={(e) =>
              editThis((s) => {
                const d = piece(e.target.value)
                if (s.kind === 'if')
                  s.condition = { piece: e.target.value, args: d ? defaultArgs(d) : {} }
              })
            }
          >
            {conditions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
          <Sentence
            def={def}
            args={step.condition.args}
            choices={choices}
            onArg={(k, v) => editThis((s) => s.kind === 'if' && void (s.condition.args[k] = v))}
          />
          {tools}
        </div>
        <StepList
          steps={step.then}
          choices={choices}
          editSteps={editSteps}
          depth={depth + 1}
          listOf={nested((s) => (s.kind === 'if' ? s.then : undefined))}
        />
        <div className="mt-1 text-xs font-medium text-muted-foreground">Otherwise</div>
        <StepList
          steps={step.else}
          choices={choices}
          editSteps={editSteps}
          depth={depth + 1}
          listOf={nested((s) => (s.kind === 'if' ? s.else : undefined))}
        />
      </div>
    )
  }

  if (step.kind === 'choice')
    return (
      <div className="group rounded-md bg-muted/30 px-1 py-1 text-sm" data-testid="step-choice">
        <div className="flex flex-wrap items-center gap-1">
          <Split className="size-3.5 text-accent" />
          <span className="font-medium">Ask</span>
          <Input
            aria-label="Question"
            className="h-7 min-w-32 flex-1 text-xs"
            value={step.prompt}
            onChange={(e) =>
              editThis((s) => s.kind === 'choice' && void (s.prompt = e.target.value))
            }
          />
          {tools}
        </div>
        {step.options.map((o, oi) => (
          <div key={o.id} className="mt-1 pl-2">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Answer</span>
              <Input
                aria-label={`Answer ${oi + 1}`}
                className="h-7 flex-1 text-xs"
                value={o.label}
                onChange={(e) =>
                  editThis(
                    (s) => s.kind === 'choice' && void (s.options[oi].label = e.target.value),
                  )
                }
              />
              <IconButton
                label="Remove answer"
                size="icon-sm"
                disabled={step.options.length <= 1}
                onClick={() => editThis((s) => s.kind === 'choice' && void s.options.splice(oi, 1))}
              >
                <Trash2 />
              </IconButton>
            </div>
            <StepList
              steps={o.steps}
              choices={choices}
              editSteps={editSteps}
              depth={depth + 1}
              listOf={nested((s) => (s.kind === 'choice' ? s.options[oi]?.steps : undefined))}
            />
          </div>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="mt-1"
          onClick={() =>
            editThis(
              (s) =>
                s.kind === 'choice' &&
                void s.options.push({ id: newId(), label: 'Another answer', steps: [] }),
            )
          }
        >
          <Plus /> Answer
        </Button>
      </div>
    )

  const total = step.branches.reduce((n, b) => n + Math.max(0, b.weight), 0) || 1
  return (
    <div className="group rounded-md bg-muted/30 px-1 py-1 text-sm" data-testid="step-random">
      <div className="flex items-center gap-1">
        <Shuffle className="size-3.5 text-accent" />
        <span className="font-medium">Pick one at random</span>
        {tools}
      </div>
      {step.branches.map((b, bi) => (
        <div key={b.id} className="mt-1 pl-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Weight
            <Input
              type="number"
              min={0}
              aria-label={`Weight ${bi + 1}`}
              className="h-7 w-16 text-xs"
              value={b.weight}
              onChange={(e) =>
                editThis(
                  (s) =>
                    s.kind === 'random' &&
                    void (s.branches[bi].weight = Math.max(0, Number(e.target.value) || 0)),
                )
              }
            />
            ({Math.round((Math.max(0, b.weight) / total) * 100)}%)
            <IconButton
              label="Remove branch"
              size="icon-sm"
              disabled={step.branches.length <= 1}
              onClick={() => editThis((s) => s.kind === 'random' && void s.branches.splice(bi, 1))}
            >
              <Trash2 />
            </IconButton>
          </div>
          <StepList
            steps={b.steps}
            choices={choices}
            editSteps={editSteps}
            depth={depth + 1}
            listOf={nested((s) => (s.kind === 'random' ? s.branches[bi]?.steps : undefined))}
          />
        </div>
      ))}
      <Button
        size="sm"
        variant="ghost"
        className="mt-1"
        onClick={() =>
          editThis(
            (s) =>
              s.kind === 'random' && void s.branches.push({ id: newId(), weight: 1, steps: [] }),
          )
        }
      >
        <Plus /> Branch
      </Button>
    </div>
  )
}

/** A piece's sentence with a picker in place of each {setting}. */
function Sentence({
  def,
  args,
  choices,
  onArg,
  fallback,
}: {
  def: PieceDef | undefined
  args: Args
  choices: Choices
  onArg: (key: string, value: Args[string]) => void
  fallback?: string
}) {
  if (!def) return <span className="text-muted-foreground italic">{fallback}</span>
  const parts = def.sentence.split(/(\{\w+\})/)
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      {parts.map((p, i) => {
        const m = /^\{(\w+)\}$/.exec(p)
        if (!m) return p.trim() ? <span key={i}>{p.trim()}</span> : null
        const f = def.fields.find((x) => x.key === m[1])
        return f ? (
          <FieldPicker
            key={i}
            field={f}
            value={args[f.key]}
            choices={choices}
            onChange={(v) => onArg(f.key, v)}
          />
        ) : null
      })}
    </span>
  )
}

function FieldPicker({
  field,
  value,
  choices,
  onChange,
}: {
  field: FieldDef
  value: Args[string]
  choices: Choices
  onChange: (v: Args[string]) => void
}) {
  const cls = 'h-7 w-auto max-w-48 text-xs font-medium'
  if (field.kind === 'text')
    return (
      <Input
        aria-label={field.label}
        className="h-7 min-w-32 flex-1 text-xs"
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  if (field.kind === 'int' || field.kind === 'percent')
    return (
      <Input
        type="number"
        aria-label={field.label}
        className="h-7 w-20 text-xs"
        value={Number(value ?? 0)}
        min={field.kind === 'percent' ? 0 : undefined}
        max={field.kind === 'percent' ? 100 : undefined}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    )
  if (field.kind === 'select')
    return (
      <NativeSelect
        aria-label={field.label}
        className={cls}
        value={String(value ?? field.default ?? '')}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    )
  const list = choices[field.kind]
  return (
    <NativeSelect
      aria-label={field.label}
      className={cn(cls, !value && 'text-danger')}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      <option value="">
        {list.length ? `Pick ${field.label.toLowerCase()}…` : `No ${field.label.toLowerCase()} yet`}
      </option>
      {list.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </NativeSelect>
  )
}

function AddStep({ choices, onAdd }: { choices: Choices; onAdd: (s: Step) => void }) {
  const effects = piecesOf('effect')
  const groups = [...new Set(effects.map((e) => e.group))]
  const conditions = piecesOf('condition')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="self-start text-muted-foreground"
          data-testid="add-step"
        >
          <Plus /> Do…
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {groups.map((g) => (
          <DropdownMenuSub key={g}>
            <DropdownMenuSubTrigger>{g}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {effects
                .filter((e) => e.group === g)
                .map((e) => (
                  <DropdownMenuItem key={e.id} onSelect={() => onAdd(effect(e.id, defaultArgs(e)))}>
                    {e.label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Branches</DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() =>
            conditions[0] &&
            onAdd(ifStep({ piece: conditions[0].id, args: defaultArgs(conditions[0]) }))
          }
        >
          <GitBranch /> If / otherwise
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAdd(choiceStep('What will you do?', ['Yes', 'No']))}>
          <Split /> A choice
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAdd(randomStep())}>
          <Shuffle /> Pick one at random
        </DropdownMenuItem>
        {choices.recipe.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Recipes</DropdownMenuLabel>
            {choices.recipe.map((r) => (
              <DropdownMenuItem
                key={r.id}
                onSelect={() => {
                  const rec = useGame.getState().game.recipes.find((x) => x.id === r.id)
                  if (rec?.steps.length) cloneSteps(rec.steps).forEach(onAdd)
                  else onAdd(effect('recipe.run', { recipe: r.id }))
                }}
              >
                Drop in “{r.name}”
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
