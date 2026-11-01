import { useMemo, useState } from 'react'
import { Input } from '@/ui/components/ui/input'
import { IconButton } from '@/ui/components/ui/button'
import { RotateCcw } from '@/ui/icons'
import { TEXT_DEFS } from '../../model/gameText'
import { useGame } from '../../store/gameStore'

/** Every line of wording the player screens use, with the default as a hint. */
export function TextView() {
  const text = useGame((s) => s.game.text)
  const commit = useGame((s) => s.commit)
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const f = q.trim().toLowerCase()
    const m = new Map<string, typeof TEXT_DEFS>()
    for (const d of TEXT_DEFS) {
      if (f && !`${d.label} ${d.default} ${text[d.key] ?? ''}`.toLowerCase().includes(f)) continue
      m.set(d.group, [...(m.get(d.group) ?? []), d])
    }
    return [...m]
  }, [q, text])
  const set = (key: string, value: string) =>
    commit((g) => {
      if (value === '') delete g.text[key]
      else g.text[key] = value
    }, `text:${key}`)
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4" data-testid="text-view">
      <div>
        <h2 className="text-base font-semibold">The game’s wording</h2>
        <p className="text-xs text-muted-foreground">
          Every line the player sees that isn’t your story. Leave a line empty to use the default.
          Words in {'{braces}'} are filled in by the game.
        </p>
      </div>
      <Input
        aria-label="Search the wording"
        placeholder="Search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {groups.map(([group, defs]) => (
        <section key={group} className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group}
          </h3>
          {defs.map((d) => (
            <div key={d.key} className="flex flex-col gap-1">
              <label htmlFor={`text-${d.key}`} className="text-xs">
                {d.label}
              </label>
              <div className="flex items-center gap-1">
                <Input
                  id={`text-${d.key}`}
                  value={text[d.key] ?? ''}
                  placeholder={d.default}
                  onChange={(e) => set(d.key, e.target.value)}
                />
                <IconButton
                  label={`Reset ${d.label}`}
                  disabled={!(d.key in text)}
                  onClick={() => set(d.key, '')}
                >
                  <RotateCcw />
                </IconButton>
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}
