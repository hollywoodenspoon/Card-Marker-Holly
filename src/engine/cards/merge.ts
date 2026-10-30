/**
 * Several card sources as one set of cards: the game's packs merged into one
 * GamePack (the shape Play's table already plays). Cards keep their ids (Cardworks
 * ids are unique across projects); pictures are shared by path (paths are content
 * hashes). Each source's decks keep their names, marked with the source when the
 * game has more than one. Pure, so it's tested without a browser.
 */
import {
  PACK_FORMAT,
  type GamePack,
  type PackCard,
  type PackDeck,
  type PackInfo,
} from '@/playtest/pack'

export interface SourcePack {
  /** "project:<id>" or "pack:<id>" (see sourceKey). */
  key: string
  name: string
  pack: GamePack
}

export interface MergedCards {
  pack: GamePack
  /** Which source each card came from. */
  sourceOf: Record<string, string>
  /** Each source's own decks, by source key. */
  decks: Record<string, PackDeck[]>
}

export function mergePacks(id: string, name: string, sources: SourcePack[]): MergedCards {
  const cards: PackCard[] = []
  const decks: PackDeck[] = []
  const images: GamePack['images'] = {}
  const sourceOf: Record<string, string> = {}
  const bySource: Record<string, PackDeck[]> = {}
  let w = 0
  let h = 0
  const setups: NonNullable<PackInfo['setups']> = []
  for (const s of sources) {
    const info = s.pack.info
    for (const c of info.cards) {
      if (sourceOf[c.id]) continue
      sourceOf[c.id] = s.key
      cards.push(c)
    }
    Object.assign(images, s.pack.images)
    bySource[s.key] = info.decks
    for (const d of info.decks)
      decks.push(sources.length > 1 ? { ...d, name: `${d.name} (${s.name})` } : d)
    w = Math.max(w, info.cardSize.w)
    h = Math.max(h, info.cardSize.h)
    setups.push(...(info.setups ?? []))
  }
  const info: PackInfo = {
    format: PACK_FORMAT,
    version: 1,
    name,
    projectId: id,
    exportedAt: Math.max(0, ...sources.map((s) => s.pack.info.exportedAt)),
    cardSize: { w: w || 63, h: h || 88 },
    cards,
    decks,
    ...(setups.length ? { setups } : {}),
  }
  return { pack: { info, images }, sourceOf, decks: bySource }
}
