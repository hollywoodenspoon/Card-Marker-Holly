import { commit, useEditor } from '@/core/editor/editorStore'
import { DEFAULT_UNITS, UNIT_OPTIONS, type LengthUnit, type UnitSettings } from '@/core/units/units'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { writeDefaultUnits } from '@/ui/components/useUnits'
import { NumberField } from '@/ui/components/fields'

/** Unit picker (+ pixels per inch for px). Controlled, so the new-project dialog can use it too. */
export function UnitsPicker({
  value,
  onChange,
  idPrefix = 'units',
}: {
  value: UnitSettings
  onChange: (u: UnitSettings) => void
  idPrefix?: string
}) {
  return (
    <div className="flex gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Label htmlFor={`${idPrefix}-unit`}>Units</Label>
        <NativeSelect
          id={`${idPrefix}-unit`}
          value={value.unit}
          onChange={(e) => onChange({ ...value, unit: e.target.value as LengthUnit })}
        >
          {UNIT_OPTIONS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      {value.unit === 'px' && (
        <NumberField
          id={`${idPrefix}-ppi`}
          className="w-28"
          label="Pixels per inch"
          min={30}
          max={2400}
          step={1}
          precision={0}
          value={value.ppi}
          onChange={(ppi) => onChange({ ...value, ppi })}
        />
      )}
    </div>
  )
}

/** The open project's units (right pane, nothing selected). */
export function ProjectUnitsControls() {
  const units = useEditor((s) => s.doc?.project.units) ?? DEFAULT_UNITS
  return (
    <UnitsPicker
      value={units}
      onChange={(u) => {
        commit((d) => {
          d.project.units = u
        }, 'units')
        writeDefaultUnits(u)
      }}
    />
  )
}
