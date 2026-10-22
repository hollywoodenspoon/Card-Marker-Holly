import { Images, Layers, Plus, SlidersHorizontal, SquareStack } from '@/ui/icons'
import { cn } from '@/lib/cn'
import { Sheet } from '@/ui/components/ui/sheet'
import { PanelBody } from '@/ui/panels/PanelBody'
import { PropertiesPanel } from '@/ui/panels/PropertiesPanel'
import { AddGrid } from '@/ui/toolbar/AddMenu'
import { TopBar } from '@/ui/toolbar/TopBar'
import { useUi } from '@/ui/uiStore'
import { CanvasArea } from '@/ui/canvas/CanvasArea'

const TOOLS = [
  { id: 'cards', label: 'Cards', icon: SquareStack },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'assets', label: 'Assets', icon: Images },
  { id: 'properties', label: 'Edit', icon: SlidersHorizontal },
] as const

const TITLES: Record<string, string> = {
  cards: 'Cards',
  decks: 'Decks',
  templates: 'Templates',
  layers: 'Layers',
  add: 'Add',
  assets: 'Assets',
  fonts: 'Fonts',
  keywords: 'Keywords',
  properties: 'Edit',
}

export function PhoneShell() {
  const { phoneSheet, setPhoneSheet } = useUi()
  return (
    <div className="h-app flex flex-col">
      <TopBar layout="phone" />
      <main className="relative flex min-h-0 flex-1 flex-col">
        <CanvasArea layout="phone" />
      </main>
      <nav
        aria-label="Tools"
        className="pb-safe flex shrink-0 items-stretch justify-around border-t bg-panel"
      >
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPhoneSheet(phoneSheet === t.id ? null : t.id)}
            aria-pressed={phoneSheet === t.id}
            className={cn(
              'flex h-16 min-w-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground',
              phoneSheet === t.id && 'text-accent',
            )}
          >
            <t.icon className={cn('size-5', t.id === 'add' && 'size-6')} />
            {t.label}
          </button>
        ))}
      </nav>
      <Sheet
        open={phoneSheet !== null}
        onOpenChange={(o) => !o && setPhoneSheet(null)}
        side="bottom"
        title={phoneSheet ? TITLES[phoneSheet] : ''}
        // Editing: a lower sheet that leaves the card visible and tappable above it.
        modal={phoneSheet !== 'properties'}
        className={phoneSheet === 'properties' ? 'max-h-[55dvh]' : undefined}
      >
        {phoneSheet === 'add' ? (
          <AddGrid onDone={() => setPhoneSheet(null)} />
        ) : phoneSheet === 'properties' ? (
          <PropertiesPanel />
        ) : phoneSheet ? (
          <PanelBody id={phoneSheet} onPicked={() => setPhoneSheet(null)} />
        ) : null}
      </Sheet>
    </div>
  )
}
