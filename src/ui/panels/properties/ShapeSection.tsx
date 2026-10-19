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
      <ColorField
        label="Shadow"
        allowNone
        value={el.shadow?.color ?? null}
        disabled={!editable}
        onChange={(v) =>
          set((s) => {
            if (!v) delete s.shadow
            else s.shadow = { dxMm: 0.8, dyMm: 0.8, opacity: 0.5, ...s.shadow, color: v }
          }, 'shadow')
        }
      />
      {el.shadow && (
        <Row cols={3}>
          <NumberField
            label="Shadow X"
            unit="mm"
            step={0.1}
            value={el.shadow.dxMm}
            disabled={!editable}
            onChange={(v) => set((s) => void (s.shadow && (s.shadow.dxMm = v)), 'shx')}
          />
          <NumberField
            label="Shadow Y"
            unit="mm"
            step={0.1}
            value={el.shadow.dyMm}
            disabled={!editable}
            onChange={(v) => set((s) => void (s.shadow && (s.shadow.dyMm = v)), 'shy')}
          />
          <NumberField
            label="Opacity"
            unit="%"
            min={0}
            max={100}
            step={5}
            precision={0}
            value={Math.round(el.shadow.opacity * 100)}
            disabled={!editable}
            onChange={(v) =>
              set(
                (s) => void (s.shadow && (s.shadow.opacity = Math.min(100, Math.max(0, v)) / 100)),
                'sho',
              )
            }
          />
        </Row>
      )}
    </Section>
  )
}
