import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  Upload,
  X,
} from '@/ui/icons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { abilityText, type AsCard } from '@/adventure/cards'
import { checkDeck, DECK_SIZE } from '@/adventure/deck'
import { cn } from '@/lib/cn'
import { downloadBlob } from '@/ui/actions/download'
import { askConfirm, toast } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { useBackHandler, useEscapeToClose } from '@/ui/components/overlay'
import { useLayout } from '@/ui/shell/useLayout'
import { usePack } from '../table/packContext'
import { AutoBuild } from './AutoBuild'
import { useDeckCards } from './useDeckCards'
import { useDecks } from './deckStore'

const DECK_FILE = 'adventure-scuffle-deck'
type SortKey = 'list' | 'fate' | 'a' | 'd' | 'fs' | 'name'

/**
 * Build Free Companies from a pack's whole card pool: pick cards on the left,
 * the deck and its rule checks on the right. Every change is saved at once.
 */
export function DeckBuilder({ onClose }: { onClose: () => void }) {
  const pack = usePack()
  const faces = pack.faces
  const phone = useLayout() === 'phone'
  const { adventure, cards, issues } = useDeckCards()
  const byId = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards])
  const order = useMemo(() => Object.fromEntries(cards.map((c, i) => [c.id, i])), [cards])

  const decks = useDecks((s) => s.decks)
  const deckId = useDecks((s) => s.deckId)
  const { select: setDeckId, update, create, toggle } = useDecks.getState()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [group, setGroup] = useState('')
  const [sort, setSort] = useState<SortKey>('list')
  const [tab, setTab] = useState<'pool' | 'deck'>('pool')
  const [showIssues, setShowIssues] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  useEscapeToClose(onClose)
  useBackHandler(() => (onClose(), true))

  useEffect(() => {
    void useDecks.getState().load(pack.id)
  }, [pack.id])

  const deck = decks?.find((d) => d.id === deckId) ?? null
  const check = deck ? checkDeck(deck.cards, byId) : null
  const inDeck = new Set(deck?.cards ?? [])

  const remove = async () => {
    if (!deck) return
    const ok = await askConfirm({
      title: `Delete ${deck.name}?`,
      description: 'The deck is removed from this browser.',
      okLabel: 'Delete',
      danger: true,
    })
    if (!ok) return
    await useDecks.getState().remove(deck.id)
  }
  const copyPackDeck = (i: number) => {
    const d = pack.info.decks[i]
    if (!d) return
    const ids = Object.entries(d.counts)
      .filter(([id, n]) => n > 0 && byId[id])
      .map(([id]) => id)
      .sort((a, b) => order[a] - order[b])
    create(d.name, ids)
    setTab('deck')
  }
  const exportDeck = () => {
    if (!deck) return
    const file = {
      format: DECK_FILE,
      version: 1,
      pack: pack.info.name,
      name: deck.name,
      cards: deck.cards.map((id) => ({ code: byId[id]?.code ?? id, name: byId[id]?.name ?? '' })),
    }
    const safe = deck.name.replace(/[^\w\- ]+/g, '').trim() || 'deck'
    downloadBlob(
      new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
      `${safe}.asdeck.json`,
    )
  }
  const copyList = async () => {
    if (!deck) return
    const lines = deck.cards.map((id) => {
      const c = byId[id]
      return c ? `${c.code === c.id ? '' : `${c.code} `}${c.name}${c.ace ? ' (Ace)' : ''}` : id
    })
    try {
      await navigator.clipboard.writeText(`${deck.name}\n${lines.join('\n')}`)
      toast('Deck list copied.')
    } catch {
      toast('Could not copy here; export the deck file instead.')
    }
  }
  const importDeck = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (data?.format !== DECK_FILE || !Array.isArray(data.cards))
        throw new Error('This is not an Adventure Scuffle deck file.')
      const byCode = new Map(cards.map((c) => [c.code, c.id]))
      const ids: string[] = []
      let missing = 0
      for (const c of data.cards as { code?: string }[]) {
        const id = (c.code && byCode.get(c.code)) || (c.code && byId[c.code] ? c.code : undefined)
        if (id) ids.push(id)
        else missing++
      }
      create(String(data.name || 'Imported deck'), ids)
      setTab('deck')
      if (missing)
        toast(
          `${missing} card${missing === 1 ? ' is' : 's are'} not in this pack and were left out.`,
        )
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }

  const types = useMemo(
    () => [...new Set(cards.map((c) => c.type).filter(Boolean))] as string[],
    [cards],
  )
  const groups = useMemo(() => [...new Set(cards.map((c) => c.group).filter(Boolean))], [cards])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = cards.filter(
      (c) =>
        (!q ||
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.ability.toLowerCase().includes(q) ||
          c.archetypes.some((a) => a.toLowerCase().includes(q))) &&
        (!type || c.type === type) &&
        (!group || c.group === group),
    )
    const by: Record<SortKey, (a: AsCard, b: AsCard) => number> = {
      list: (a, b) => order[a.id] - order[b.id],
      fate: (a, b) => a.fate - b.fate,
      a: (a, b) => b.a - a.a,
      d: (a, b) => b.d - a.d,
      fs: (a, b) => b.fs - a.fs,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return list.sort(by[sort])
  }, [cards, query, type, group, sort, order])

  const pool = (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Card pool">
      <div className="flex flex-wrap items-end gap-2 border-b p-3">
        <div className="relative min-w-40 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search cards"
            placeholder="Search name, code or ability"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {types.length > 0 && (
          <NativeSelect
            aria-label="Card type"
            className="w-auto"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </NativeSelect>
        )}
        {groups.length > 0 && (
          <NativeSelect
            aria-label="Group"
            className="w-auto"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="">All groups</option>
            {groups.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </NativeSelect>
        )}
        <NativeSelect
          aria-label="Sort by"
          className="w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="list">Pack order</option>
          {adventure && (
            <>
              <option value="fate">Fate Number</option>
              <option value="a">Attack</option>
              <option value="d">Defense</option>
              <option value="fs">Fighting Spirit</option>
            </>
          )}
          <option value="name">Name</option>
        </NativeSelect>
      </div>
      {issues.length > 0 && (
        <div className="border-b px-3 py-2 text-xs">
          <button
            type="button"
            className="flex min-h-8 items-center gap-1.5 text-amber-700 dark:text-amber-400"
            onClick={() => setShowIssues((v) => !v)}
            aria-expanded={showIssues}
          >
            <TriangleAlert className="size-3.5" />
            {new Set(issues.map((i) => i.cardId)).size} card(s) have missing or odd values
          </button>
          {showIssues && (
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {issues.map((i, k) => (
                <li key={k}>
                  {i.name}: {i.problem}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ul
        className="grid min-h-0 flex-1 auto-rows-max grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 overflow-auto p-3"
        data-testid="deck-pool"
      >
        {shown.map((c) => {
          const f = faces[c.id]
          const on = inDeck.has(c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                aria-label={`${on ? 'Remove' : 'Add'} ${c.name}`}
                title={c.ability ? abilityText(c.ability) : c.name}
                className={cn(
                  'flex w-full flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors',
                  on ? 'border-accent bg-accent-soft' : 'hover:bg-muted',
                )}
              >
                <span
                  className="relative block w-full overflow-hidden rounded-md bg-muted"
                  style={{ aspectRatio: f ? `${f.w} / ${f.h}` : '63 / 88' }}
                >
                  {f?.front && (
                    <img
                      src={f.front}
                      alt=""
                      className="size-full object-cover"
                      draggable={false}
                    />
                  )}
                  {on && (
                    <span className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Check className="size-4" />
                    </span>
                  )}
                </span>
                <span className="truncate text-xs font-medium">
                  {c.name}
                  {c.ace && <span className="ml-1 text-accent">Ace</span>}
                </span>
                {adventure && (
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {c.type ?? '?'} · {c.fs}/{c.a}/{c.d} · {c.fate}
                  </span>
                )}
              </button>
            </li>
          )
        })}
        {shown.length === 0 && (
          <li className="col-span-full p-4 text-sm text-muted-foreground">No cards match.</li>
        )}
      </ul>
    </section>
  )

  const deckPanel = (
    <aside
      className={cn('flex min-h-0 flex-col bg-panel', phone ? 'flex-1' : 'w-80 shrink-0 border-l')}
      aria-label="Deck"
    >
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Label htmlFor="deck-pick">Deck</Label>
            <NativeSelect
              id="deck-pick"
              value={deckId ?? ''}
              onChange={(e) => setDeckId(e.target.value || null)}
              disabled={!decks?.length}
            >
              {!decks?.length && <option value="">No decks yet</option>}
              {decks?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <IconButton label="New deck" variant="outline" onClick={() => create('New deck')}>
            <Plus />
          </IconButton>
        </div>
        {adventure && (
          <AutoBuild
            packId={pack.id}
            cards={cards}
            packDecks={pack.info.decks.map((d) =>
              Object.entries(d.counts)
                .filter(([id, n]) => n > 0 && byId[id])
                .map(([id]) => id),
            )}
            onBuilt={(name, ids) => {
              create(name, ids)
              setTab('deck')
            }}
          />
        )}
        {pack.info.decks.length > 0 && (
          <NativeSelect
            aria-label="Start from a deck in the pack"
            value=""
            onChange={(e) => e.target.value && copyPackDeck(Number(e.target.value))}
          >
            <option value="">Start from a pack deck…</option>
            {pack.info.decks.map((d, i) => (
              <option key={i} value={i}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        )}
      </div>
      {deck ? (
        <>
          <div className="flex flex-col gap-1 border-b p-3">
            <Label htmlFor="deck-name">Name</Label>
            <Input
              id="deck-name"
              value={deck.name}
              onChange={(e) => update({ name: e.target.value })}
              onBlur={(e) => !e.target.value.trim() && update({ name: 'Untitled deck' })}
            />
          </div>
          <div className="flex items-center justify-between px-3 pt-3 text-sm">
            <span className="font-medium tabular-nums" data-testid="deck-count">
              {deck.cards.length} / {DECK_SIZE} cards
            </span>
            {adventure && (
              <span className="text-xs text-muted-foreground">{check?.aces ?? 0} / 1 Ace</span>
            )}
          </div>
          <div className="px-3 pt-1 pb-2 text-xs" role="status" data-testid="deck-check">
            {check?.ok ? (
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <Check className="size-3.5" /> Ready to play
              </span>
            ) : (
              <ul className="flex flex-col gap-0.5 text-amber-700 dark:text-amber-400">
                {check?.problems.map((p) => (
                  <li key={p} className="flex gap-1.5">
                    <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ol className="min-h-0 flex-1 overflow-auto px-2 pb-2" data-testid="deck-list">
            {[...deck.cards]
              .sort((a, b) => (byId[a]?.fate ?? 0) - (byId[b]?.fate ?? 0) || order[a] - order[b])
              .map((id) => {
                const c = byId[id]
                return (
                  <li
                    key={id}
                    className="flex min-h-11 items-center gap-2 rounded-md px-1 hover:bg-muted"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">
                        {c?.name ?? 'Missing card'}
                        {c?.ace && <span className="ml-1 text-xs text-accent">Ace</span>}
                      </span>
                      {adventure && c && (
                        <span className="block text-[11px] text-muted-foreground tabular-nums">
                          {c.code} · {c.type ?? '?'} · {c.fs}/{c.a}/{c.d} · Fate {c.fate}
                        </span>
                      )}
                    </span>
                    <IconButton
                      label={`Remove ${c?.name ?? 'card'}`}
                      size="icon-sm"
                      onClick={() => toggle(id)}
                    >
                      <X />
                    </IconButton>
                  </li>
                )
              })}
            {deck.cards.length === 0 && (
              <li className="p-2 text-sm text-muted-foreground">
                Tap cards in the pool to add them.
              </li>
            )}
          </ol>
          <div className="flex flex-wrap gap-2 border-t p-3">
            <Button size="sm" variant="secondary" onClick={exportDeck}>
              <Download /> Export
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void copyList()}>
              <Copy /> Copy list
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-danger"
              onClick={() => void remove()}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3 p-4 text-sm text-muted-foreground">
          <p>
            A Free Company is {DECK_SIZE} different cards{adventure ? ', with at most one Ace' : ''}
            . Start a new deck, or tap any card in the pool.
          </p>
          <Button onClick={() => create('New deck')}>
            <Plus /> New deck
          </Button>
        </div>
      )}
      <div className="border-t px-3 py-2">
        <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
          <Upload /> Import deck file
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void importDeck(f)
          }}
        />
      </div>
    </aside>
  )

  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-40 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Decks"
      data-testid="deck-builder"
    >
      <header className="app-topbar flex shrink-0 items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton label="Done" onClick={onClose}>
          <ArrowLeft />
        </IconButton>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Decks</div>
          <div className="truncate text-xs text-muted-foreground">
            {pack.info.name} · {cards.length} cards in the pool
          </div>
        </div>
        {phone && (
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'pool' | 'deck')}>
            <TabsList>
              <TabsTrigger value="pool">Pool</TabsTrigger>
              <TabsTrigger value="deck">Deck {deck ? `(${deck.cards.length})` : ''}</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </header>
      <div className="flex min-h-0 flex-1">
        {(!phone || tab === 'pool') && pool}
        {(!phone || tab === 'deck') && deckPanel}
      </div>
    </div>
  )
}
