import { useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import { Input } from '@/ui/components/ui/input'
import { useViewMode, ViewModeToggle } from '@/ui/components/ViewModeToggle'
import { Search } from '@/ui/icons'
import { useGameCards } from '../../cards/gameCards'
import { sourceKey } from '../../model/game'
import { useGame } from '../../store/gameStore'

/** All the game's cards, by source, read-only (edit them in Cards). */
export function CardsPanel() {
  const sources = useGame((s) => s.game.sources)
  const merged = useGameCards((s) => s.merged)
  const faces = useGameCards((s) => s.open?.faces)
  const status = useGameCards((s) => s.status)
  const [mode, setMode] = useViewMode('engine-cards', 'grid')
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cards = (merged?.pack.info.cards ?? []).filter(
      (c) => !q || c.name.toLowerCase().includes(q),
    )
    return sources.map((s) => ({
      src: s,
      cards: cards.filter((c) => merged?.sourceOf[c.id] === sourceKey(s)),
    }))
  }, [sources, merged, query])
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search cards"
            placeholder="Search"
            className="h-9 pl-8 md:h-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <ViewModeToggle value={mode} onChange={setMode} />
      </div>
      {status === 'loading' && <p className="text-sm text-muted-foreground">Loading cards…</p>}
      {!sources.length && (
        <p className="text-sm text-muted-foreground">
          No card sources yet. Add one in the Game panel.
        </p>
      )}
      {groups.map(({ src, cards }) => (
        <section key={sourceKey(src)} className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {src.name} · {cards.length}
          </h3>
          <ul
            className={cn(
              mode === 'grid' ? 'grid grid-cols-3 gap-1.5' : 'flex flex-col gap-1',
              mode === 'details' && 'text-xs',
            )}
          >
            {cards.map((c) => {
              const url = faces?.[c.id]?.front
              const img = url && (
                <img
                  src={url}
                  alt=""
                  className={cn(
                    'rounded object-contain',
                    mode === 'grid' ? 'w-full' : mode === 'large' ? 'h-16' : 'h-8',
                  )}
                />
              )
              if (mode === 'grid')
                return (
                  <li key={c.id} title={c.name}>
                    {img}
                    <span className="block truncate text-[10px]">{c.name}</span>
                  </li>
                )
              return (
                <li key={c.id} className="flex items-center gap-2">
                  {mode !== 'details' && img}
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  {mode === 'details' && (
                    <span className="text-muted-foreground">
                      {Object.keys(c.fields).length} fields
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
