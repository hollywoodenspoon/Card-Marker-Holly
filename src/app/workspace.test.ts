import { describe, expect, it } from 'vitest'
import { parseHash, routeHash } from './workspace'

describe('workspace routes', () => {
  it('reads each workspace', () => {
    expect(parseHash('#/cards')).toEqual({ ws: 'cards' })
    expect(parseHash('#/engine')).toEqual({ ws: 'engine' })
    expect(parseHash('#/play')).toEqual({ ws: 'play' })
    expect(parseHash('#/play/')).toEqual({ ws: 'play' })
  })
  it('reads a pack to open in Play', () => {
    expect(parseHash('#/play/pack=tfq')).toEqual({ ws: 'play', pack: 'tfq' })
    expect(parseHash('#/play/pack=a%20b')).toEqual({ ws: 'play', pack: 'a b' })
  })
  it("treats the old Table link (#pack=) as Play", () => {
    expect(parseHash('#pack=tfq')).toEqual({ ws: 'play', pack: 'tfq' })
  })
  it('ignores empty and unknown hashes', () => {
    expect(parseHash('')).toBeNull()
    expect(parseHash('#')).toBeNull()
    expect(parseHash('#/nope')).toBeNull()
    expect(parseHash('#section')).toBeNull()
  })
  it('writes hashes that read back the same', () => {
    for (const r of [{ ws: 'cards' }, { ws: 'engine' }, { ws: 'play' }, { ws: 'play', pack: 'a b' }] as const)
      expect(parseHash(routeHash(r))).toEqual(r)
    expect(routeHash({ ws: 'engine', pack: 'x' })).toBe('#/engine')
  })
})
