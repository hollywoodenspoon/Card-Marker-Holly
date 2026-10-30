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
  /** Play only: the game pack to open. */
  pack?: string
}

const KEY = 'cardmaker.workspace'
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

function remembered(): Workspace {
  try {
    const v = localStorage.getItem(KEY)
    return isWs(v) ? v : 'cards'
  } catch {
    return 'cards'
  }
}

function initial(): Route {
  if (__COZY__ || typeof location === 'undefined') return { ws: 'cards' }
  return parseHash(location.hash) ?? { ws: remembered() }
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
    const r: Route = pack ? { ws, pack } : { ws }
    set({ ws: r.ws, pack: r.pack })
    if (location.hash !== routeHash(r)) history.pushState(null, '', routeHash(r))
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
    if (next) useWorkspace.setState({ ws: next.ws, pack: next.pack })
  }
  window.addEventListener('hashchange', follow)
  window.addEventListener('popstate', follow)
  useWorkspace.subscribe((s, prev) => {
    if (s.ws === prev.ws) return
    try {
      localStorage.setItem(KEY, s.ws)
    } catch {
      // Private windows: the workspace just isn't remembered.
    }
  })
}
