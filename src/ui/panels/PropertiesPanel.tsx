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

export function PropertiesPanel() {
  const els = useEditor(useShallow(selectedElements))
  const state = useEditor()
  if (!state.doc) return null

  if (els.length === 0) return <DocumentProperties />

  if (els.length > 1) {
    const editable = els.every((e) => isLayoutEditable(state, e.id))
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
  const editable = isLayoutEditable(state, el.id) && !el.editLocked
  return (
    <div>
      <div className="border-b px-4 py-3">
        <div className="truncate text-sm font-semibold">{el.name}</div>
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
