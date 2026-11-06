import { RULE_NAMES, type UwRules } from '@/urban/state'

const KEYS = Object.keys(RULE_NAMES) as (keyof UwRules)[]

/** Trial rule changes, shared by the table and the simulation. Off = the printed rulebook. */
export function UrbanRules({
  rules,
  onChange,
  disabled,
}: {
  rules: UwRules
  onChange: (r: UwRules) => void
  disabled?: boolean
}) {
  return (
    <fieldset className="flex flex-col gap-1 rounded-md border p-2 text-sm" disabled={disabled}>
      <legend className="px-1 text-xs text-muted-foreground">Trial rule changes</legend>
      {KEYS.map((k) => (
        <label key={k} className="flex min-h-11 items-center gap-2 md:min-h-8">
          <input
            type="checkbox"
            className="size-4"
            checked={!!rules[k]}
            onChange={(e) => onChange({ ...rules, [k]: e.target.checked })}
          />
          {RULE_NAMES[k]}
        </label>
      ))}
    </fieldset>
  )
}
