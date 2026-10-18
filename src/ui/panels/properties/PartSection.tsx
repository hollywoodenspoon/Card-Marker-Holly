import { LayoutTemplate } from 'lucide-react'
import { useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { updateElement } from '@/core/editor/elementCommands'
import { activeTemplate, currentCard, ownerOf } from '@/core/editor/selectors'
import type { Element } from '@/core/model/types'
import { editTemplate, renameField, toggleVisibility } from '@/templates/commands'
import { isField, sharedFieldNames } from '@/templates/fields'
import { isVisibleOnCard } from '@/templates/resolve'
import { Button } from '@/ui/components/ui/button'
import { Input, Label } from '@/ui/components/ui/input'
import { Switch } from '@/ui/components/ui/switch'
import { Section } from '@/ui/components/fields'

/** How this element behaves as a template part: field name, default visibility, per-card toggling. */
export function PartSection({ el }: { el: Element }) {
  const mode = useEditor((s) => s.view.mode)
  const owner = useEditor((s) => ownerOf(s, el.id))
  const template = useEditor(activeTemplate)
  const card = useEditor(currentCard)

  if (mode === 'card' && owner === 'template') {
    const visible = isVisibleOnCard(el, card)
    return (
      <Section title="Template part">
        <label className="flex items-center justify-between gap-3 text-sm">
          Show on this card
          <Switch
            checked={visible}
            disabled={el.toggleLocked}
            onCheckedChange={() => toggleVisibility(el.id)}
            aria-label="Show on this card"
          />
        </label>
        {el.toggleLocked && (
          <p className="text-xs text-muted-foreground">This part is always shown.</p>
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
    </Section>
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
