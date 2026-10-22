/** What a link the page opens in a new window should do. */
export type OpenRoute = 'table' | 'external' | 'deny'

/**
 * Hearthside Table (the app's own playtest/ page) opens in its own window;
 * web links go to the browser; anything else is refused.
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
  if (origins.includes(origin) && /^\/(?:.*\/)?playtest\/(?:index\.html)?$/.test(u.pathname))
    return 'table'
  if (u.protocol === 'https:') return 'external'
  return 'deny'
}
