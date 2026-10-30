/** What a link the page opens in a new window should do. */
export type OpenRoute = 'self' | 'external' | 'deny'

/**
 * The app's old extra pages (playtest/ for Hearthside Table, engine/ for Hearthside
 * Engine) are workspaces of the one window now: they load there and redirect to
 * Play or Engine. Web links go to the browser; anything else is refused.
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
  if (
    origins.includes(origin) &&
    /^\/(?:.*\/)?(?:playtest|engine)\/(?:index\.html)?$/.test(u.pathname)
  )
    return 'self'
  if (u.protocol === 'https:') return 'external'
  return 'deny'
}
