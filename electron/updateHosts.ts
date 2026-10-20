/** The only places the desktop app may reach, and only for update checks with updates on. */
export function isUpdateHost(url: string): boolean {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  if (u.protocol !== 'https:') return false
  const h = u.hostname
  return h === 'api.github.com' || h === 'github.com' || h.endsWith('.githubusercontent.com')
}

const parse = (v: string) => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(v.trim())
  if (!m) return null
  return { nums: [+m[1], +m[2], +m[3]], pre: m[4] ? m[4].split('.') : [] }
}

/** Semver order: -1, 0 or 1 (a release is newer than its pre-releases). Unknown versions sort first. */
export function compareVersions(a: string, b: string): number {
  const x = parse(a)
  const y = parse(b)
  if (!x || !y) return x ? 1 : y ? -1 : 0
  for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] < y.nums[i] ? -1 : 1
  if (!x.pre.length || !y.pre.length)
    return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i]
    const q = y.pre[i]
    if (p === undefined) return -1
    if (q === undefined) return 1
    if (p === q) continue
    const pn = /^\d+$/.test(p)
    const qn = /^\d+$/.test(q)
    if (pn && qn) return +p < +q ? -1 : 1
    if (pn !== qn) return pn ? -1 : 1
    return p < q ? -1 : 1
  }
  return 0
}

export const isPrerelease = (v: string) => /-/.test(v)

/** The newest version in a GitHub releases.atom feed ("…/releases/tag/v1.2.3" links). */
export function newestTag(
  atom: string,
  includePrereleases: boolean,
): { version: string; url: string } | null {
  let best: { version: string; url: string } | null = null
  for (const m of atom.matchAll(/href="(https:\/\/github\.com\/[^"]+\/releases\/tag\/([^"]+))"/g)) {
    const version = decodeURIComponent(m[2]).replace(/^v/, '')
    if (!/^\d+\.\d+\.\d+/.test(version)) continue
    if (isPrerelease(version) && !includePrereleases) continue
    if (!best || compareVersions(version, best.version) > 0) best = { version, url: m[1] }
  }
  return best
}

/** The first line of an error, short enough for a message. */
export function shortError(e: unknown): string {
  const first = (e instanceof Error ? e.message : String(e)).split('\n')[0].trim()
  const text = /latest(-linux)?\.yml/.test(first)
    ? 'the newest release has no update file yet'
    : first.replace(/\s*\(https?:[^)]*\)/g, '')
  return text.length > 140 ? `${text.slice(0, 137)}…` : text
}
