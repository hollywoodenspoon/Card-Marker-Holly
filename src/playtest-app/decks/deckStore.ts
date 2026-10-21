import { create } from 'zustand'
import { deleteDeck, listDecks, saveDeck, type DeckRow } from '@/playtest/library'
import { toast } from '@/ui/components/feedback'

/**
 * The Decks screen's decks for one pack. Changes show at once and are written
 * to the database behind them, so quick taps never work on a stale copy.
 */
interface DeckState {
  packId: string | null
  decks: DeckRow[] | null
  deckId: string | null
  load: (packId: string) => Promise<void>
  select: (id: string | null) => void
  /** Store a deck (new or changed) and make it the current one. */
  put: (row: Omit<DeckRow, 'updatedAt'>) => void
  /** Change the current deck; with none, `create` makes one first. */
  update: (patch: Partial<Pick<DeckRow, 'name' | 'cards'>>) => void
  create: (name: string, cards?: string[]) => void
  toggle: (cardId: string) => void
  remove: (id: string) => Promise<void>
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

const current = (s: Pick<DeckState, 'decks' | 'deckId'>) =>
  s.decks?.find((d) => d.id === s.deckId) ?? null

export const useDecks = create<DeckState>((set, get) => ({
  packId: null,
  decks: null,
  deckId: null,
  load: async (packId) => {
    set({ packId, decks: null, deckId: null })
    const rows = await listDecks(packId)
    if (get().packId === packId) set({ decks: rows, deckId: rows[0]?.id ?? null })
  },
  select: (deckId) => set({ deckId }),
  put: (row) => {
    const next = { ...row, updatedAt: Date.now() }
    set((s) => ({
      decks: [next, ...(s.decks ?? []).filter((d) => d.id !== next.id)],
      deckId: next.id,
    }))
    void saveDeck(row).catch((e) =>
      toast(`Could not save the deck: ${e instanceof Error ? e.message : String(e)}`),
    )
  },
  update: (patch) => {
    const d = current(get())
    if (d) get().put({ ...d, ...patch })
  },
  create: (name, cards = []) => {
    const { packId, decks } = get()
    if (!packId) return
    const names = new Set(decks?.map((d) => d.name))
    let n = name
    for (let i = 2; names.has(n); i++) n = `${name} ${i}`
    get().put({ id: newId(), packId, name: n, cards })
  },
  toggle: (cardId) => {
    const d = current(get())
    if (!d) return get().create('New deck', [cardId])
    get().update({
      cards: d.cards.includes(cardId) ? d.cards.filter((c) => c !== cardId) : [...d.cards, cardId],
    })
  },
  remove: async (id) => {
    await deleteDeck(id)
    set((s) => {
      const decks = (s.decks ?? []).filter((d) => d.id !== id)
      return { decks, deckId: s.deckId === id ? (decks[0]?.id ?? null) : s.deckId }
    })
  },
}))
