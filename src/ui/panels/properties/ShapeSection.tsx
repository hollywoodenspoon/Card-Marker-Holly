import { updateElement } from '@/core/editor/elementCommands'
import type { ShapeElement, ShapeKind } from '@/core/model/types'
import { ColorField, NumberField, Row, Section } from '@/ui/components/fields'
import { Label, NativeSelect } from '@/ui/components/ui/input'

export function ShapeSection({ el, editable }: { el: ShapeElement; editable: boolean }) {
  const set = (fn: (e: ShapeElement) => void, key: string) =>
    updateElement(el.id, (d) => fn(d as ShapeElement), `${key}:${el.id}`)
  return (
    <Section title="Shape">
      <div className="flex flex-col gap-1">
        <Label htmlFor="shape-kind">Type</Label>
        <NativeSelect
          id="shape-kind"
          value={el.kind}
          disabled={!editable}
          onChange={(e) => set((s) => void (s.kind = e.target.value as ShapeKind), 'kind')}
        >
          <option value="rect">Rectangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="line">Line</option>
        </NativeSelect>
      </div>
      {el.kind !== 'line' && (
        <ColorField
          label="Fill"
          allowNone
          value={el.fill}
          disabled={!editable}
          onChange={(v) => set((s) => void (s.fill = v), 'fill')}
        />
      )}
      <ColorField
        label={el.kind === 'line' ? 'Colour' : 'Stroke'}
        allowNone={el.kind !== 'line'}
        value={el.stroke}
        disabled={!editable}
        onChange={(v) => set((s) => void (s.stroke = v), 'stroke')}
      />
      <Row>
        <NumberField
          label="Stroke width"
          unit="mm"
          min={0}
          step={0.1}
          value={el.strokeMm}
          disabled={!editable}
          onChange={(v) => set((s) => void (s.strokeMm = v), 'sw')}
        />
        {el.kind === 'rect' && (
          <NumberField
            label="Corner radius"
            unit="mm"
            min={0}
            step={0.5}
            value={el.radiusMm}
            disabled={!editable}
            onChange={(v) => set((s) => void (s.radiusMm = v), 'radius')}
          />
        )}
      </Row>
    </Section>
  )
}
