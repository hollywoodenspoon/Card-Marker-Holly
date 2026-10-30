/**
 * The app's three workspaces on one page: Cards (the card editor), Engine (the
 * game-maker) and Play (Hearthside Table). The URL hash names the open one, so
 * links, Back and reload keep it: "#/cards", "#/engine", "#/play" and
 * "#/play/pack=<id>" (a game pack to open). The Cozy Edition is Cards only.
 */
import { create } from 'zustand'

export type Workspace = 'cards' | 'engine' | 'play'

export const WORKSPACES: { id: Workspace; label: string }[] = [
  { id: 'cards', label: 'Cards' },
  { id: 'engine', label: 'Engine' },
  { id: 'play', label: 'Play' },
]

export interface Route {
  ws: Workspace
  /** Play only: the game pack to open (kept while another workspace is on screen). */
  pack?: string
}

const KEY = 'cardmaker.workspace'
/** Play's open pack, so a reload in another workspace still comes back to the game. */
const PACK_KEY = 'cardmaker.playPack'
const isWs = (v: unknown): v is Workspace => v === 'cards' || v === 'engine' || v === 'play'

/** Reads a hash. "#pack=<id>" (the old Hearthside Table link) means Play with that pack. */
export function parseHash(hash: string): Route | null {
  const h = hash.replace(/^#/, '')
  if (!h) return null
  const legacy = new URLSearchParams(h).get('pack')
  if (!h.startsWith('/')) return legacy ? { ws: 'play', pack: legacy } : null
  const [, ws, rest] = /^\/([a-z]+)\/?(.*)$/.exec(h) ?? []
  if (!isWs(ws)) return null
  if (ws !== 'play') return { ws }
  const pack = new URLSearchParams(rest).get('pack')
  return pack ? { ws, pack } : { ws }
}

export function routeHash(r: Route): string {
  return r.ws === 'play' && r.pack ? `#/play/pack=${encodeURIComponent(r.pack)}` : `#/${r.ws}`
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function initial(): Route {
  if (__COZY__ || typeof location === 'undefined') return { ws: 'cards' }
  const last = read(KEY)
  const r = parseHash(location.hash) ?? { ws: isWs(last) ? last : 'cards' }
  if (r.ws === 'play') return r
  const pack = read(PACK_KEY)
  return pack ? { ...r, pack } : r
}

interface WorkspaceState extends Route {
  /** Switch workspace (a new history entry, so Back returns). */
  go: (ws: Workspace, pack?: string) => void
  /** Play: change the open pack without a new history entry. */
  setPack: (pack: string | undefined) => void
}

export const useWorkspace = create<WorkspaceState>((set, get) => ({
  ...initial(),
  go: (ws, pack) => {
    if (__COZY__) return
    // Play keeps its open pack while you're in another workspace.
    const keep = pack ?? get().pack
    set({ ws, pack: keep })
    const hash = routeHash({ ws, pack: keep })
    if (location.hash !== hash) history.pushState(null, '', hash)
  },
  setPack: (pack) => {
    const r: Route = { ws: get().ws, pack }
    set({ pack })
    if (location.hash !== routeHash(r)) history.replaceState(null, '', routeHash(r))
  },
}))

/** True when the given workspace is the one on screen (hidden ones ignore keys). */
export const isActive = (ws: Workspace) => useWorkspace.getState().ws === ws

if (!__COZY__ && typeof window !== 'undefined') {
  // Show the route in the address bar from the start, without a history entry.
  const r = useWorkspace.getState()
  if (location.hash !== routeHash(r)) history.replaceState(null, '', routeHash(r))
  const follow = () => {
    const next = parseHash(location.hash)
    if (!next) return
    // Only a Play route says which pack is open; elsewhere the open pack stays.
    if (next.ws === 'play') useWorkspace.setState({ ws: next.ws, pack: next.pack })
    else useWorkspace.setState({ ws: next.ws })
  }
  window.addEventListener('hashchange', follow)
  window.addEventListener('popstate', follow)
  useWorkspace.subscribe((s, prev) => {
    try {
      if (s.ws !== prev.ws) localStorage.setItem(KEY, s.ws)
      if (s.pack !== prev.pack)
        if (s.pack) localStorage.setItem(PACK_KEY, s.pack)
        else localStorage.removeItem(PACK_KEY)
    } catch {
      // Private windows: the workspace just isn't remembered.
    }
  })
}
