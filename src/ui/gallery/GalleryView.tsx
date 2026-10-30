import { ArrowLeft, Search } from '@/ui/icons'
import { memo, useCallback, useMemo, useRef, useState } from 'react'
import { HelpButton } from '@/help/HelpButton'
import { selectCard } from '@/core/editor/cardCommands'
import { useEditor } from '@/core/editor/editorStore'
import type { Card, Deck, Template } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { setCardText } from '@/templates/fieldCommands'
import { proofFields } from '@/templates/proofread'
import { CardThumb } from '@/ui/canvas/CardThumb'
import { IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { useEscapeToClose } from '@/ui/components/overlay'
import { usePanZoom } from '@/ui/components/usePanZoom'
import { ZoomBar } from '@/ui/components/ZoomBar'

const NO_DECKS: Deck[] = []
const DEFAULT_SIZE = 220
const MIN_SIZE = 80
const MAX_SIZE = 800

/**
 * All cards in a big grid, or as a text table for proofreading (with spell check).
 * Shelved since the one-app merge (owner, 2026-10-30): nothing opens it for now, and
 * the code stays so it can come back.
 */
export function GalleryView({ onClose: close }: { onClose: () => void }) {
  useEscapeToClose(close)
  const cards = useEditor((s) => s.doc!.cards)
  const decks = useEditor((s) => s.doc!.project.decks) ?? NO_DECKS
  const [tab, setTab] = useState<'grid' | 'proof'>('grid')
  const [deckId, setDeckId] = useState('')
  const [q, setQ] = useState('')
  const [sides, setSides] = useState<'front' | 'back' | 'both'>('front')
  const [size, setSize] = useState(DEFAULT_SIZE)
  const mainRef = useRef<HTMLElement>(null)
  // Card-editor controls: Ctrl/⌘ + wheel or pinch resizes the cards (redrawn sharp,
  // keeping the spot under the pointer), Space / middle-drag pans.
  const resize = (f: number, at?: { x: number; y: number }) => {
    const el = mainRef.current
    setSize((old) => {
      const next = Math.round(Math.min(MAX_SIZE, Math.max(MIN_SIZE, old * f)))
      const k = next / old
      if (el && at && k !== 1)
        requestAnimationFrame(() => {
          el.scrollTop = (el.scrollTop + at.y) * k - at.y
          el.scrollLeft = (el.scrollLeft + at.x) * k - at.x
        })
      return next
    })
  }
  const pz = usePanZoom(mainRef, {
    onZoom: (f, at) => tab === 'grid' && resize(f, at),
    onPan: (dx, dy) => mainRef.current?.scrollBy(-dx, -dy),
    onFit: () => setSize(DEFAULT_SIZE),
  })
  const deck = decks.find((d) => d.id === deckId)
  const list = useMemo(() => {
    const all = Object.values(cards).sort((a, b) => a.order - b.order)
    return all.filter(
      (c) =>
        (!deck || (deck.counts[c.id] ?? 0) > 0) &&
        (!q || c.name.toLowerCase().includes(q.toLowerCase())),
    )
  }, [cards, deck, q])
  const open = useCallback(
    (c: Card) => {
      selectCard(c.id)
      close()
    },
    [close],
  )

  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-50 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton label="Back to editor" onClick={close}>
          <ArrowLeft />
        </IconButton>
        <div className="mr-2 text-sm font-semibold">Gallery</div>
        <HelpButton topic="gallery" />
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="grid">Cards</TabsTrigger>
            <TabsTrigger value="proof">Proofread</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-32 flex-1 sm:max-w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search"
            aria-label="Search cards"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {decks.length > 0 && (
          <NativeSelect
            aria-label="Deck"
            className="w-auto"
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
          >
            <option value="">All cards</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        )}
        {tab === 'grid' && (
          <>
            <NativeSelect
              aria-label="Sides"
              className="w-auto"
              value={sides}
              onChange={(e) => setSides(e.target.value as typeof sides)}
            >
              <option value="front">Fronts</option>
              <option value="back">Backs</option>
              <option value="both">Both</option>
            </NativeSelect>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Size
              <input
                type="range"
                min={MIN_SIZE}
                max={MAX_SIZE}
                step={20}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                aria-label="Card size"
                className="w-24 accent-accent"
              />
            </label>
          </>
        )}
        <span className="text-xs text-muted-foreground" data-testid="gallery-count">
          {list.length} card{list.length === 1 ? '' : 's'}
          {deck ? ` · ${deck.name}` : ''}
        </span>
      </header>
      <main
        ref={mainRef}
        className={cn(
          'relative min-h-0 flex-1 overflow-auto',
          tab === 'grid' && 'touch-pan-y bg-canvas',
        )}
        style={{ cursor: pz.cursor }}
        {...(tab === 'grid' ? pz.handlers : {})}
        data-testid="gallery-main"
      >
        {tab === 'grid' ? (
          <ul className="flex flex-wrap content-start gap-4 p-4" aria-label="Cards">
            {list.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c)}
                  className="flex flex-col items-center gap-1.5 rounded-lg p-1 text-white/90 focus-visible:outline-2 focus-visible:outline-accent"
                  title={`Open ${c.name}`}
                >
                  <span className="flex gap-2">
                    {sides !== 'back' && <CardThumb card={c} side="front" heightPx={size} />}
                    {sides !== 'front' && <CardThumb card={c} side="back" heightPx={size} />}
                  </span>
                  <span className="max-w-full truncate text-xs">
                    {c.name}
                    {deck ? ` × ${deck.counts[c.id]}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <Proofread list={list} onOpen={open} />
        )}
        {list.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No cards to show.</p>
        )}
      </main>
      {tab === 'grid' && (
        <ZoomBar
          className="bottom-[calc(0.75rem+env(safe-area-inset-bottom))]"
          zoom={size / DEFAULT_SIZE}
          onZoom={(f) => resize(f)}
          onFit={() => setSize(DEFAULT_SIZE)}
        />
      )}
    </div>
  )
}

function Proofread({ list, onOpen }: { list: Card[]; onOpen: (c: Card) => void }) {
  const templates = useEditor((s) => s.doc!.templates)
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-3" data-testid="proofread">
      <p className="text-xs text-muted-foreground">
        Your browser underlines spelling mistakes. Edit plain text right here; text with its own
        formatting is edited on the card (click its name). Grey text is the template default.
      </p>
      {list.map((c) => (
        <ProofSection key={c.id} card={c} templates={templates} onOpen={onOpen} />
      ))}
    </div>
  )
}

/** One card's text. Memoized: typing re-renders only the card being edited. */
const ProofSection = memo(function ProofSection({
  card: c,
  templates,
  onOpen,
}: {
  card: Card
  templates: Record<string, Template>
  onOpen: (c: Card) => void
}) {
  return (
    <section className="rounded-lg border bg-panel p-3">
      <div className="mb-2 flex items-center gap-2">
        <CardThumb card={c} side="front" heightPx={40} />
        <button
          type="button"
          className="text-sm font-semibold hover:underline"
          onClick={() => onOpen(c)}
        >
          {c.name}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {proofFields(c, templates).map((f) => (
          <div key={f.field} className="flex flex-col gap-1">
            <Label htmlFor={`pf-${c.id}-${f.field}`}>
              {f.field}
              {f.side === 'back' ? ' (back)' : ''}
              {!f.editable ? ' · formatted' : ''}
            </Label>
            <textarea
              id={`pf-${c.id}-${f.field}`}
              spellCheck
              rows={Math.min(6, Math.max(1, f.text.split('\n').length))}
              readOnly={!f.editable}
              defaultValue={f.own ? f.text : ''}
              placeholder={f.own ? '' : f.text}
              onChange={(e) => setCardText(c.id, f.field, e.target.value)}
              className={cn(
                'w-full resize-y rounded-md border border-input bg-background p-2 text-base outline-none focus-visible:border-accent md:text-sm',
                !f.editable && 'text-muted-foreground',
              )}
            />
          </div>
        ))}
      </div>
    </section>
  )
})
