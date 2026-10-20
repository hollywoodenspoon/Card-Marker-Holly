import { useShallow } from 'zustand/react/shallow'
import { distributeSelection, groupSelection } from '@/core/editor/elementCommands'
import { useEditor } from '@/core/editor/editorStore'
import { setBleed, setCornerGuide, setNumberStart, setSafe } from '@/core/editor/projectCommands'
import { isLayoutEditable, selectedElements } from '@/core/editor/selectors'
import { Button } from '@/ui/components/ui/button'
import { Switch } from '@/ui/components/ui/switch'
import { NumberField, Row, Section } from '@/ui/components/fields'
import { CardSizeControls } from './properties/CardSizeControls'
import { ProjectUnitsControls } from './properties/UnitsControls'
import { AlignButtons, GeometrySection } from './properties/GeometrySection'
import { IconRowSection } from './properties/IconRowSection'
import { ImageFieldSection, ImageSection } from './properties/ImageSection'
import { PartSection } from './properties/PartSection'
import { ShapeSection } from './properties/ShapeSection'
import { TextSection } from './properties/TextSection'
import { renameElement } from '@/templates/commands'

export function PropertiesPanel() {
  const els = useEditor(useShallow(selectedElements))
  // Narrow subscriptions: the whole store changes on every edit and selection.
  const hasDoc = useEditor((s) => !!s.doc)
  const layoutEditable = useEditor((s) => els.every((e) => isLayoutEditable(s, e.id)))
  if (!hasDoc) return null

  if (els.length === 0) return <DocumentProperties />

  if (els.length > 1) {
    const editable = layoutEditable
    return (
      <div>
        <Section title={`${els.length} selected`}>
          <AlignButtons disabled={!editable} />
          <Row>
            <Button
              variant="outline"
              size="sm"
              disabled={!editable || els.length < 3}
              onClick={() => distributeSelection('x')}
            >
              Distribute ↔
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!editable || els.length < 3}
              onClick={() => distributeSelection('y')}
            >
              Distribute ↕
            </Button>
          </Row>
          <Button variant="secondary" size="sm" disabled={!editable} onClick={groupSelection}>
            Group selection
          </Button>
        </Section>
      </div>
    )
  }

  const el = els[0]
  const editable = layoutEditable && !el.editLocked
  return (
    <div>
      <div className="border-b px-4 py-3">
        {/* Rename here (also on touch, where double-clicking a layer is awkward). */}
        <input
          key={el.id + el.name}
          aria-label="Name"
          defaultValue={el.name}
          disabled={!editable}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== el.name) renameElement(el.id, v)
            else e.target.value = el.name
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="-mx-1 h-11 w-full min-w-0 truncate rounded-md border border-transparent bg-transparent px-1 text-sm font-semibold outline-none hover:border-input focus:border-accent disabled:opacity-100 md:h-7"
        />
        <div className="text-xs text-muted-foreground">{typeLabel(el.type)}</div>
      </div>
      <PartSection el={el} />
      {el.type === 'text' && <TextSection el={el} editable={editable} />}
      {el.type === 'image' && <ImageSection el={el} editable={editable} />}
      {el.type === 'imageField' && <ImageFieldSection el={el} />}
      {el.type === 'iconRow' && <IconRowSection el={el} editable={editable} />}
      {el.type === 'shape' && <ShapeSection el={el} editable={editable} />}
      <GeometrySection el={el} editable={editable} />
    </div>
  )
}

function typeLabel(t: string) {
  return (
    {
      text: 'Text field',
      imageField: 'Image field',
      iconRow: 'Icon row',
      shape: 'Shape',
      image: 'Image',
      group: 'Group',
    } as Record<string, string>
  )[t]
}

function DocumentProperties() {
  const project = useEditor((s) => s.doc!.project)
  return (
    <div>
      <Section title="Card">
        <CardSizeControls />
        <ProjectUnitsControls />
      </Section>
      <Section title="Print area">
        <Row>
          <NumberField
            label="Bleed"
            unit="mm"
            min={0}
            max={10}
            step={0.5}
            value={project.bleedMm}
            onChange={setBleed}
          />
          <NumberField
            label="Safe margin"
            unit="mm"
            min={0}
            max={20}
            step={0.5}
            value={project.safeMm}
            onChange={setSafe}
          />
        </Row>
        <p className="text-xs text-muted-foreground">
          Bleed is the extra artwork beyond the cut line (red). Keep text inside the safe area
          (green).
        </p>
      </Section>
      <Section title="Corner cutter guide">
        <label className="flex items-center justify-between gap-3 text-sm">
          Show rounded corners
          <Switch
            checked={!!project.cornerGuide?.enabled}
            onCheckedChange={(v) => setCornerGuide({ enabled: v })}
            aria-label="Show rounded corners"
          />
        </label>
        {project.cornerGuide?.enabled && (
          <NumberField
            label="Corner radius"
            unit="mm"
            min={0.5}
            max={15}
            step={0.5}
            value={project.cornerGuide.radiusMm}
            onChange={(v) => setCornerGuide({ radiusMm: Math.max(0.5, v) })}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Shades the corners your corner cutter will remove, in the editor and print preview. It is
          never printed.
        </p>
      </Section>
      <Section title="Card numbers">
        <NumberField
          label="First card is number"
          min={0}
          max={9999}
          step={1}
          precision={0}
          value={project.numberStart ?? 1}
          onChange={(v) => setNumberStart(Math.max(0, Math.round(v)))}
        />
        <p className="text-xs text-muted-foreground">
          Type {'{#}'} in any text for the card's number (its place in the Cards list), {'{#:3}'}{' '}
          for 001, and {'{total}'} for the number of cards. Add → Card number adds one.
        </p>
      </Section>
    </div>
  )
}
