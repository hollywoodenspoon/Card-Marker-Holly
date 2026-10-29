/** What a link the page opens in a new window should do. */
export type OpenRoute = 'table' | 'engine' | 'external' | 'deny'

/**
 * The app's own extra pages open in their own window: the playtest/ page as
 * Hearthside Table, the engine/ page as Hearthside Engine. Web links go to the
 * browser; anything else is refused.
 */
export function routeOpen(url: string, origins: string[]): OpenRoute {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return 'deny'
  }
  // URL.origin is "null" for custom schemes such as app://, so compare by hand.
  const origin = `${u.protocol}//${u.host}`
  if (origins.includes(origin)) {
    if (/^\/(?:.*\/)?playtest\/(?:index\.html)?$/.test(u.pathname)) return 'table'
    if (/^\/(?:.*\/)?engine\/(?:index\.html)?$/.test(u.pathname)) return 'engine'
  }
  if (u.protocol === 'https:') return 'external'
  return 'deny'
}
