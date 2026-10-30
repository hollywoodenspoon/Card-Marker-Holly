/**
 * A game: the engine's project. It lists where its cards come from (live Cardworks
 * projects and game packs, all equal), and holds its decks, zones, variables,
 * scenes, events and recipes. Map scenes point at a map in the maps table, so the
 * 3D editor keeps its own document and autosave. Pure data and helpers, no UI.
 */
import { newId } from '@/core/model/ids'
import type { SubPath } from '@/vector/geometry'
import type { GameEvent, Recipe } from './events'
import type { CardSource } from './map'

export type { CardSource }

/**
 * A list of cards with counts. It's a deck for a card game, and just as well any
 * list a game needs ("all swords"). Decks from a card source are read-only copies
 * of that source's decks; game decks are made here (by hand or by the builder).
 */
export interface GameDeck {
  id: string
  name: string
  counts: Record<string, number>
  /** 'game' = made in the Engine; otherwise the card source deck it was copied from. */
  origin: 'game' | { source: string; deck: string }
  /** How it was built, when the deck builder made it. */
  level?: DeckLevel
}

export type DeckLevel = 'suboptimal' | 'optimal' | 'veryOptimal'
export const DECK_LEVEL_LABELS: Record<DeckLevel, string> = {
  suboptimal: 'Suboptimal',
  optimal: 'Optimal',
  veryOptimal: 'Very optimal',
}

/** A named pile cards can be in during play: Hand, Discard, Removed… */
export interface Zone {
  id: string
  name: string
  /** One per player, or one shared by everyone. */
  owner: 'player' | 'shared'
  faceUp: boolean
}

/** A named flag or number. No numbered switches: everything has a name. */
export interface VarDef {
  id: string
  name: string
  kind: 'flag' | 'number'
  initial: boolean | number
}

/** A picture: one of the game's own images, or one of a card project's assets. */
export interface ImageRef {
  store: 'game' | 'cards'
  id: string
}

export interface Glow {
  what: 'none' | 'edge' | 'fill'
  when: 'hover' | 'click' | 'both'
  color: string
  /** 0–1: how strong the light is. */
  strength: number
  /** Blur radius in scene pixels: how soft the glow's edge is. */
  softness: number
}

export const DEFAULT_GLOW: Glow = {
  what: 'edge',
  when: 'hover',
  color: '#ffd27a',
  strength: 0.8,
  softness: 18,
}

/** A clickable part of a picture, any shape. Invisible to the player (except its glow). */
export interface ClickArea {
  id: string
  name: string
  /** In scene pixels (the background picture's own size). */
  paths: SubPath[]
  glow: Glow
  events: GameEvent[]
}

/** Something placed on a picture scene: a character spot, a card or a picture. */
export interface SceneObject {
  id: string
  kind: 'spot' | 'card' | 'image'
  name: string
  /** Top-left and size, in scene pixels. */
  x: number
  y: number
  w: number
  h: number
  visible: boolean
  image?: ImageRef
  cardId?: string
  events: GameEvent[]
}

export interface PictureScene {
  id: string
  name: string
  kind: 'picture'
  background: ImageRef | null
  /** The scene's size in pixels (the background's size when it has one). */
  width: number
  height: number
  areas: ClickArea[]
  objects: SceneObject[]
  /** Scene events ("when this scene starts…"). */
  events: GameEvent[]
}

export interface MapScene {
  id: string
  name: string
  kind: 'map'
  /** A row in the maps table (the 3D editor's own document). */
  mapId: string
  events: GameEvent[]
}

export type Scene = PictureScene | MapScene

export interface GameDoc {
  version: 1
  id: string
  name: string
  sources: CardSource[]
  decks: GameDeck[]
  zones: Zone[]
  variables: VarDef[]
  scenes: Scene[]
  startScene: string | null
  /** Game-wide events ("when the game starts…"). */
  events: GameEvent[]
  recipes: Recipe[]
}

export const DEFAULT_ZONES = (): Zone[] => [
  { id: newId(), name: 'Hand', owner: 'player', faceUp: false },
  { id: newId(), name: 'Discard', owner: 'player', faceUp: true },
  { id: newId(), name: 'Removed', owner: 'shared', faceUp: true },
]

export function newGame(name = 'My game'): GameDoc {
  return {
    version: 1,
    id: newId(),
    name,
    sources: [],
    decks: [],
    zones: DEFAULT_ZONES(),
    variables: [],
    scenes: [],
    startScene: null,
    events: [],
    recipes: [],
  }
}

export function newPictureScene(name = 'New scene', width = 1600, height = 900): PictureScene {
  return { id: newId(), name, kind: 'picture', background: null, width, height, areas: [], objects: [], events: [] }
}

export const mapScene = (mapId: string, name: string): MapScene => ({
  id: newId(),
  name,
  kind: 'map',
  mapId,
  events: [],
})

export const newArea = (name: string, paths: SubPath[]): ClickArea => ({
  id: newId(),
  name,
  paths,
  glow: { ...DEFAULT_GLOW },
  events: [],
})

export const newObject = (
  kind: SceneObject['kind'],
  name: string,
  box: { x: number; y: number; w: number; h: number },
): SceneObject => ({ id: newId(), kind, name, ...box, visible: true, events: [] })

export const newVariable = (name: string, kind: VarDef['kind']): VarDef => ({
  id: newId(),
  name,
  kind,
  initial: kind === 'flag' ? false : 0,
})

export const newDeck = (name: string, counts: Record<string, number> = {}): GameDeck => ({
  id: newId(),
  name,
  counts,
  origin: 'game',
})

export const deckSize = (d: { counts: Record<string, number> }) =>
  Object.values(d.counts).reduce((n, c) => n + c, 0)

/** A deck as a flat list of card ids (each copy once), in a stable order. */
export function deckList(d: { counts: Record<string, number> }): string[] {
  const out: string[] = []
  for (const [id, n] of Object.entries(d.counts)) for (let i = 0; i < n; i++) out.push(id)
  return out
}

/** A flat id list as counts (the deck builder works in lists). */
export function countsOf(ids: string[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const id of ids) counts[id] = (counts[id] ?? 0) + 1
  return counts
}

export const sceneOf = (g: GameDoc, id: string | null | undefined) =>
  id ? (g.scenes.find((s) => s.id === id) ?? null) : null

export const sourceKey = (s: CardSource) => `${s.kind}:${s.id}`

/** Fill anything an older or hand-edited game file lacks. */
export function tidyGame(raw: Partial<GameDoc> & { id: string }): GameDoc {
  const g = newGame(typeof raw.name === 'string' ? raw.name : 'Untitled game')
  return {
    ...g,
    id: raw.id,
    sources: Array.isArray(raw.sources) ? raw.sources : [],
    decks: Array.isArray(raw.decks) ? raw.decks : [],
    zones: Array.isArray(raw.zones) ? raw.zones : g.zones,
    variables: Array.isArray(raw.variables) ? raw.variables : [],
    scenes: Array.isArray(raw.scenes) ? raw.scenes : [],
    startScene: typeof raw.startScene === 'string' ? raw.startScene : null,
    events: Array.isArray(raw.events) ? raw.events : [],
    recipes: Array.isArray(raw.recipes) ? raw.recipes : [],
  }
}
