/**
 * The open game's cards: every card source loaded and merged into one OpenPack,
 * the shape Play's table plays. A pack source is read from Play's pack library; a
 * live Cardworks project is exported to a pack with the card app's own renderer
 * (so every picture matches print) and cached there, rebuilt only when the
 * project's cards, templates or images actually changed (a fingerprint of them).
 */
import { create } from 'zustand'
import { APP_VERSION } from '@/app/appInfo'
import { useEditor, type DocState, type LibraryState } from '@/core/editor/editorStore'
import { addPack, playtestDb } from '@/playtest/library'
import { readPack } from '@/playtest/pack'
import { openPack, type OpenPack } from '@/playtest-app/table/packContext'
import { getBackend } from '@/storage'
import { sourceKey, type CardSource, type GameDoc } from '../model/game'
import { db } from '../storage/db'
import { mergePacks, type MergedCards, type SourcePack } from './merge'

export interface GameCardsState {
  /** The game these cards are for (Play and the Engine may each ask for one). */
  gameId: string | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  progress: string | null
  error: string | null
  /** The merged cards, ready for Play's table (id = the game's id). */
  open: OpenPack | null
  merged: MergedCards | null
  /** Sources that couldn't load (a deleted project, a pack no longer in this browser). */
  missing: CardSource[]
  /** The images of the live card projects (usable in scenes), by asset id. */
  cardImages: Record<string, { name: string; blob: Blob; source: string }>
}

export const useGameCards = create<GameCardsState>(() => ({
  gameId: null,
  status: 'idle',
  progress: null,
  error: null,
  open: null,
  merged: null,
  missing: [],
  cardImages: {},
}))

/** A short fingerprint of what a project's card pictures depend on. */
function fingerprint(doc: DocState, library: LibraryState): string {
  const text = JSON.stringify([
    doc.project.defaultSize,
    doc.project.decks,
    doc.templates,
    doc.cards,
    doc.stylePresets,
    Object.keys(library.assets).sort(),
    Object.keys(library.fonts).sort(),
  ])
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return `${text.length}:${(h >>> 0).toString(36)}`
}

/** A live project's pack bytes: the cached export, or a fresh one when the project changed. */
async function projectPack(
  id: string,
  onProgress: (msg: string) => void,
): Promise<{ bytes: Uint8Array; library: LibraryState } | null> {
  const ed = useEditor.getState()
  let doc: DocState
  let library: LibraryState
  if (ed.doc?.project.id === id) {
    doc = ed.doc
    library = ed.library
  } else {
    const loaded = await getBackend().loadProject(id)
    if (!loaded) return null
    doc = loaded.doc
    library = loaded.library
  }
  const print = fingerprint(doc, library)
  const key = `packPrint:${id}`
  const row = await playtestDb().packs.get(id)
  const known = (await db.settings.get(key))?.value
  if (row && known === print)
    return { bytes: new Uint8Array(await row.file.arrayBuffer()), library }
  if (!Object.keys(doc.cards).length) return null
  const { registerProjectFonts } = await import('@/assets/fonts')
  const { exportGamePack } = await import('@/print/pack/exportPack')
  await registerProjectFonts(Object.values(library.fonts))
  const r = await exportGamePack(
    {
      project: doc.project,
      templates: doc.templates,
      cards: Object.values(doc.cards),
      assets: library.assets,
      fonts: Object.values(library.fonts),
      stylePresets: doc.stylePresets,
    },
    APP_VERSION,
    (d, t) => onProgress(`${doc.project.name}: card ${d} of ${t}…`),
  )
  await addPack(r.bytes)
  await db.settings.put({ key, value: print })
  return { bytes: r.bytes, library }
}

let loading = 0

/** Load and merge a game's card sources (one load at a time; a newer call wins). */
export async function loadGameCards(game: GameDoc): Promise<void> {
  const run = ++loading
  const set = (s: Partial<GameCardsState>) => run === loading && useGameCards.setState(s)
  set({ gameId: game.id, status: 'loading', error: null, progress: null })
  try {
    const parts: SourcePack[] = []
    const missing: CardSource[] = []
    const cardImages: GameCardsState['cardImages'] = {}
    for (const src of game.sources) {
      let bytes: Uint8Array | null = null
      if (src.kind === 'pack') {
        const row = await playtestDb().packs.get(src.id)
        bytes = row ? new Uint8Array(await row.file.arrayBuffer()) : null
      } else {
        const r = await projectPack(src.id, (progress) => set({ progress }))
        bytes = r?.bytes ?? null
        for (const a of Object.values(r?.library.assets ?? {}))
          cardImages[a.id] = { name: a.name, blob: a.blob, source: src.name }
      }
      if (!bytes) {
        missing.push(src)
        continue
      }
      parts.push({ key: sourceKey(src), name: src.name, pack: readPack(bytes) })
    }
    if (run !== loading) return
    const merged = mergePacks(game.id, game.name, parts)
    const open = openPack(game.id, merged.pack)
    const old = useGameCards.getState().open
    set({ status: 'ready', progress: null, open, merged, missing, cardImages })
    old?.close()
  } catch (e) {
    set({ status: 'error', progress: null, error: e instanceof Error ? e.message : String(e) })
  }
}
