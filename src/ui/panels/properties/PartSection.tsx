import { Filter, LayoutTemplate, Lock } from '@/ui/icons'
import { useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { updateElement } from '@/core/editor/elementCommands'
import { activeTemplate, currentCard, ownerOf } from '@/core/editor/selectors'
import { fieldNames } from '@/core/model/tree'
import type { Element, FieldElement, ShowRule } from '@/core/model/types'
import { editTemplate, renameField, toggleVisibility } from '@/templates/commands'
import { isField, sharedFieldNames } from '@/templates/fields'
import { cleanColumn } from '@/templates/mailMerge'
import { isVisibleOnCard, lockedVisibility } from '@/templates/resolve'
import { fieldDefaults, RULE_OPS } from '@/templates/rules'
import { Button } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Switch } from '@/ui/components/ui/switch'
import { Section } from '@/ui/components/fields'

/** How this element behaves as a template part: field name, default visibility, per-card toggling. */
export function PartSection({ el }: { el: Element }) {
  const mode = useEditor((s) => s.view.mode)
  const owner = useEditor((s) => ownerOf(s, el.id))
  const template = useEditor(activeTemplate)
  const card = useEditor(currentCard)

  if (mode === 'card' && owner === 'template') {
    const visible = isVisibleOnCard(
      el,
      card,
      template ? fieldDefaults(template.elements) : undefined,
    )
    return (
      <Section title="Template part">
        {el.toggleLocked ? (
          // Not a switch that can't move: say what it is.
          <p className="flex items-center gap-2 text-sm" data-testid="part-locked">
            <Lock className="size-4 shrink-0 text-muted-foreground" />
            {lockedVisibility(el, visible)}
          </p>
        ) : (
          <label className="flex items-center justify-between gap-3 text-sm">
            Show on this card
            <Switch
              checked={visible}
              onCheckedChange={() => toggleVisibility(el.id)}
              aria-label="Show on this card"
            />
          </label>
        )}
        <p className="text-xs text-muted-foreground">
          Position and style come from the template “{template?.name}”.
        </p>
        {template && (
          <Button variant="outline" size="sm" onClick={() => editTemplate(template.id)}>
            <LayoutTemplate /> Edit template
          </Button>
        )}
      </Section>
    )
  }

  if (owner !== 'template') return null
  return (
    <Section title="Template part">
      {isField(el) && template && (
        <FieldNameInput
          key={el.id + el.fieldName}
          el={el}
          shared={sharedFieldNames(template, el).length}
        />
      )}
      {isField(el) && <MergeColumnInput key={el.id + (el.mergeColumn ?? '')} el={el} />}
      <label className="flex items-center justify-between gap-3 text-sm">
        Shown by default
        <Switch
          checked={el.defaultVisible}
          onCheckedChange={(v) => updateElement(el.id, (e) => void (e.defaultVisible = v))}
          aria-label="Shown by default"
        />
      </label>
      <label className="flex items-center justify-between gap-3 text-sm">
        Can be hidden per card
        <Switch
          checked={!el.toggleLocked}
          onCheckedChange={(v) => updateElement(el.id, (e) => void (e.toggleLocked = !v))}
          aria-label="Can be hidden per card"
        />
      </label>
      {template && <ShowWhen el={el} fields={fieldNames(template.elements)} />}
    </Section>
  )
}

/** "Show only when <field> <condition> <value>" for a template part. */
function ShowWhen({ el, fields }: { el: Element; fields: string[] }) {
  const rule = el.showIf
  const set = (r: ShowRule | undefined, coalesce?: string) =>
    updateElement(
      el.id,
      (e) => {
        if (r) e.showIf = r
        else delete e.showIf
      },
      coalesce,
    )
  const op = RULE_OPS.find((o) => o.id === rule?.op)
  if (!rule)
    return (
      <Button
        variant="outline"
        size="sm"
        className="self-start"
        disabled={!fields.length}
        onClick={() => set({ field: fields[0], op: 'is', value: '' })}
      >
        <Filter /> Show only when…
      </Button>
    )
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-2" data-testid="show-when">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Show only when</span>
        <Button size="sm" variant="ghost" onClick={() => set(undefined)}>
          Remove
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <NativeSelect
          aria-label="Field"
          value={rule.field}
          onChange={(e) => set({ ...rule, field: e.target.value })}
        >
          {!fields.includes(rule.field) && <option value={rule.field}>{rule.field}</option>}
          {fields.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Condition"
          value={rule.op}
          onChange={(e) => set({ ...rule, op: e.target.value as ShowRule['op'] })}
        >
          {RULE_OPS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {op?.needsValue && (
        <Input
          aria-label="Value"
          placeholder="e.g. Rare"
          value={rule.value ?? ''}
          onChange={(e) => set({ ...rule, value: e.target.value }, `showIf:${el.id}`)}
        />
      )}
      <p className="text-xs text-muted-foreground">
        Hidden on cards where this isn't true (ignores capitals). The eye in Layers can still show
        or hide it on one card.
      </p>
    </div>
  )
}

function FieldNameInput({ el, shared }: { el: Element & { fieldName: string }; shared: number }) {
  const [v, setV] = useState(el.fieldName)
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="field-name">Field name</Label>
      <Input
        id="field-name"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => (v.trim() ? renameField(el.id, v.trim()) : setV(el.fieldName))}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <p className="text-xs text-muted-foreground">
        Cards store their value under this name, so it carries over when a card switches to another
        template with the same field.
        {shared > 0 &&
          ` ${shared} other part${shared > 1 ? 's' : ''} here use${shared > 1 ? '' : 's'} the same name and show the same value.`}
      </p>
    </div>
  )
}

/** Which spreadsheet column this field reads in a mail merge. */
function MergeColumnInput({ el }: { el: FieldElement }) {
  const [v, setV] = useState(el.mergeColumn ?? '')
  const save = () => {
    const col = cleanColumn(v)
    if (v.trim() && !col) return setV(el.mergeColumn ?? '')
    if (col === el.mergeColumn) return setV(col ?? '')
    updateElement(el.id, (e) => {
      if (!('fieldName' in e)) return
      if (col) e.mergeColumn = col
      else delete e.mergeColumn
    })
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor="merge-column" className="text-sm font-normal text-foreground">
        Spreadsheet column
      </Label>
      <Input
        id="merge-column"
        className="w-20 text-center uppercase"
        placeholder="—"
        maxLength={3}
        value={v}
        onChange={(e) => setV(e.target.value.toUpperCase())}
        onBlur={save}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
    </div>
  )
}
