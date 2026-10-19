import { PRESET_GROUPS, SIZE_PRESETS } from '@/core/units/presets'
import { formatSize } from '@/core/units/units'
import { useUnits } from '@/ui/components/useUnits'

/** `<option>`s for the card size presets, grouped, with sizes in the display unit. */
export function SizePresetOptions() {
  const units = useUnits()
  return (
    <>
      {PRESET_GROUPS.map((g) => (
        <optgroup key={g} label={g}>
          {SIZE_PRESETS.filter((p) => p.group === g).map((p) => (
            <option key={p.id} value={p.id}>
              {p.label} ({formatSize(p.widthMm, p.heightMm, units)})
            </option>
          ))}
        </optgroup>
      ))}
      <option value="custom">Custom</option>
    </>
  )
}
