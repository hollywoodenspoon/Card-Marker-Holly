import { useMemo, useState } from 'react'
import { newId } from '@/core/model/ids'
import { cn } from '@/lib/cn'
import { Button, IconButton } from '@/ui/components/ui/button'
import { ColorField, Section } from '@/ui/components/fields'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/ui/icons'
import {
  newCharacter,
  newLayer,
  newOption,
  type PortraitLayer,
  type PortraitTemplate,
  type Recolor,
} from '../../model/characters'
import { usePortraitOf } from '../../portraits/render'
import { useGame } from '../../store/gameStore'
import { ImageField } from './ImageField'

const RECOLOR_LABELS: Record<Recolor, string> = {
  ramp: 'Grey-to-colour ramp',
  hue: 'Hue shift',
  none: 'As drawn',
}

/** A portrait template in the centre: layers, options, expressions and a preview. */
export function PortraitView({ template }: { template: PortraitTemplate }) {
  const commit = useGame((s) => s.commit)
  const edit = (recipe: (t: PortraitTemplate) => void, key?: string) =>
    commit((g) => {
      const t = g.portraits.find((x) => x.id === template.id)
      if (t) recipe(t)
    }, key)
  const editLayer = (id: string, recipe: (l: PortraitLayer) => void, key?: string) =>
    edit((t) => {
      const l = t.layers.find((x) => x.id === id)
      if (l) recipe(l)
    }, key)
  const [expression, setExpression] = useState(template.expressions[0]?.id ?? '')
  const preview = useMemo(() => newCharacter('Preview', template), [template])
  const url = usePortraitOf(template, preview, expression)
  // Layers listed top first, like a layers panel.
  const layers = [...template.layers].reverse()
  return (
    <div className="flex h-full min-h-0 flex-col lg:flex-row" data-testid="portrait-view">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Portrait template">
          <Input
            aria-label="Template name"
            value={template.name}
            onChange={(e) => edit((t) => void (t.name = e.target.value), `pt-name:${template.id}`)}
          />
          <div className="grid grid-cols-2 gap-2">
            <SizeField
              label="Width (px)"
              value={template.width}
              onChange={(v) => edit((t) => void (t.width = v))}
            />
            <SizeField
              label="Height (px)"
              value={template.height}
              onChange={(v) => edit((t) => void (t.height = v))}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Every layer picture is drawn at this size, so draw them on the same canvas.
          </p>
        </Section>
        <Section
          title="Layers (top first)"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                edit((t) => void t.layers.push(newLayer(`Layer ${t.layers.length + 1}`)))
              }
            >
              <Plus /> Layer
            </Button>
          }
        >
          {layers.map((l) => {
            const i = template.layers.indexOf(l)
            return (
              <div key={l.id} className="rounded-lg border p-2" data-testid="portrait-layer">
                <div className="flex items-center gap-1">
                  <Input
                    aria-label="Layer name"
                    className="h-9 min-w-0 flex-1 font-medium md:h-8"
                    value={l.name}
                    onChange={(e) =>
                      editLayer(l.id, (x) => void (x.name = e.target.value), `ly:${l.id}`)
                    }
                  />
                  <IconButton
                    label="Move up"
                    size="icon-sm"
                    disabled={i === template.layers.length - 1}
                    onClick={() =>
                      edit((t) => void t.layers.splice(i, 2, t.layers[i + 1], t.layers[i]))
                    }
                  >
                    <ArrowUp />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    size="icon-sm"
                    disabled={i === 0}
                    onClick={() =>
                      edit((t) => void t.layers.splice(i - 1, 2, t.layers[i], t.layers[i - 1]))
                    }
                  >
                    <ArrowDown />
                  </IconButton>
                  <IconButton
                    label={`Delete ${l.name}`}
                    size="icon-sm"
                    onClick={() => edit((t) => void t.layers.splice(i, 1))}
                  >
                    <Trash2 />
                  </IconButton>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <Label>Colour</Label>
                    <NativeSelect
                      aria-label={`${l.name} recolour`}
                      value={l.recolor}
                      onChange={(e) =>
                        editLayer(l.id, (x) => void (x.recolor = e.target.value as Recolor))
                      }
                    >
                      {(Object.keys(RECOLOR_LABELS) as Recolor[]).map((r) => (
                        <option key={r} value={r}>
                          {RECOLOR_LABELS[r]}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                  {l.recolor !== 'none' && (
                    <ColorField
                      label="Starting colour"
                      value={l.color}
                      onChange={(v) =>
                        v && editLayer(l.id, (x) => void (x.color = v), `lc:${l.id}`)
                      }
                    />
                  )}
                  <label className="flex min-h-11 items-center gap-2 self-end text-sm md:min-h-8">
                    <input
                      type="checkbox"
                      checked={!l.required}
                      onChange={(e) =>
                        editLayer(l.id, (x) => void (x.required = !e.target.checked))
                      }
                    />
                    Can be left empty
                  </label>
                </div>
                <ul className="mt-2 flex flex-col gap-2">
                  {l.options.map((o, oi) => (
                    <li key={o.id} className="rounded-md bg-muted/40 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          aria-label="Option name"
                          className="h-9 w-36 md:h-8"
                          value={o.name}
                          onChange={(e) =>
                            editLayer(
                              l.id,
                              (x) => void (x.options[oi].name = e.target.value),
                              `op:${o.id}`,
                            )
                          }
                        />
                        <ImageField
                          value={o.image}
                          onChange={(r) => editLayer(l.id, (x) => void (x.options[oi].image = r))}
                        />
                        <IconButton
                          label={`Delete ${o.name}`}
                          size="icon-sm"
                          className="ml-auto"
                          onClick={() => editLayer(l.id, (x) => void x.options.splice(oi, 1))}
                        >
                          <Trash2 />
                        </IconButton>
                      </div>
                      {template.expressions.length > 1 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-xs text-muted-foreground">
                            Pictures for expressions ({Object.keys(o.byExpression).length})
                          </summary>
                          <div className="mt-1 flex flex-col gap-1">
                            {template.expressions.slice(1).map((ex) => (
                              <div key={ex.id} className="flex items-center gap-2 text-xs">
                                <span className="w-20 truncate">{ex.name}</span>
                                <ImageField
                                  label={`${ex.name} picture`}
                                  size="size-9"
                                  value={o.byExpression[ex.id] ?? null}
                                  onChange={(r) =>
                                    editLayer(l.id, (x) => {
                                      const by = x.options[oi].byExpression
                                      if (r) by[ex.id] = r
                                      else delete by[ex.id]
                                    })
                                  }
                                />
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1"
                  onClick={() =>
                    editLayer(
                      l.id,
                      (x) => void x.options.push(newOption(`Option ${x.options.length + 1}`)),
                    )
                  }
                >
                  <Plus /> Option
                </Button>
              </div>
            )
          })}
        </Section>
        <Section
          title="Expressions"
          action={
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                edit(
                  (t) =>
                    void t.expressions.push({
                      id: newId(),
                      name: `Expression ${t.expressions.length + 1}`,
                    }),
                )
              }
            >
              <Plus /> Expression
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground">
            The first is the neutral face. Others swap an option’s picture where it has one for them
            (usually eyes and mouth).
          </p>
          <ul className="flex flex-col gap-1">
            {template.expressions.map((ex, i) => (
              <li key={ex.id} className="flex items-center gap-1">
                <Input
                  aria-label="Expression name"
                  className="h-9 min-w-0 flex-1 md:h-8"
                  value={ex.name}
                  onChange={(e) =>
                    edit((t) => void (t.expressions[i].name = e.target.value), `ex:${ex.id}`)
                  }
                />
                <IconButton
                  label={`Delete ${ex.name}`}
                  size="icon-sm"
                  disabled={template.expressions.length <= 1}
                  onClick={() =>
                    edit((t) => {
                      t.expressions.splice(i, 1)
                      for (const l of t.layers)
                        for (const o of l.options) delete o.byExpression[ex.id]
                    })
                  }
                >
                  <Trash2 />
                </IconButton>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <aside className="flex shrink-0 flex-col items-center gap-2 border-t p-3 lg:w-80 lg:border-t-0 lg:border-l">
        <NativeSelect
          aria-label="Preview expression"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
        >
          {template.expressions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </NativeSelect>
        <Checker className="w-full" ratio={template.width / Math.max(1, template.height)}>
          {url && <img src={url} alt="Portrait preview" className="h-full w-full object-contain" />}
        </Checker>
        <p className="text-xs text-muted-foreground">
          Each layer’s first option and starting colour.
        </p>
      </aside>
    </div>
  )
}

function SizeField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label>{label}</Label>
      <Input
        type="number"
        min={16}
        max={2048}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(Math.max(16, Math.min(2048, Number(e.target.value) || 16)))}
      />
    </div>
  )
}

/** A neutral checkerboard behind a portrait, so transparent parts show. */
export function Checker({
  children,
  ratio,
  className,
}: {
  children: React.ReactNode
  ratio: number
  className?: string
}) {
  return (
    <div
      className={cn('overflow-hidden rounded-lg border', className)}
      style={{
        aspectRatio: String(ratio || 1),
        background: 'repeating-conic-gradient(#3a3a40 0 25%, #2c2c31 0 50%) 50% / 20px 20px',
      }}
    >
      {children}
    </div>
  )
}
