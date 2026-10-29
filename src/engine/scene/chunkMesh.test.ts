import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { type MapDoc, newMapDoc, setTile, type Tile } from '../model/map'
import { buildChunk, CHUNK, chunksOf, dirtyChunks, quadCount, WATER_DROP } from './chunkMesh'

/** A map of exactly the given tiles (row-major, null = hole). */
function mapOf(w: number, d: number, tiles: (Tile | null)[]): MapDoc {
  const m = newMapDoc('t', { x: w, z: d })
  m.tiles = tiles
  return m
}
const quads = (m: MapDoc) => quadCount(buildChunk(m, 0, 0))

describe('chunk mesh', () => {
  it('a lone one-step column shows its top and four one-band sides', () => {
    expect(quads(mapOf(1, 1, [{ type: 'grass', h: 2 }]))).toBe(5)
  })

  it('culls the wall between two equal columns', () => {
    expect(
      quads(
        mapOf(2, 1, [
          { type: 'grass', h: 2 },
          { type: 'grass', h: 2 },
        ]),
      ),
    ).toBe(8)
  })

  it('bands a two-step wall and a half-step wall', () => {
    expect(quads(mapOf(1, 1, [{ type: 'grass', h: 4 }]))).toBe(9) // 2 bands × 4 + top
    expect(quads(mapOf(1, 1, [{ type: 'grass', h: 3 }]))).toBe(9) // 1.5 = a full band + a half band
  })

  it('a ramp has a tilted top, banded flat sides and single sloped sides', () => {
    // Rises 2 half steps to the north: north wall 2 bands, south 1, east and west 1 sloped quad each.
    expect(quads(mapOf(1, 1, [{ type: 'grass', h: 2, slope: { dir: 'n', rise: 2 } }]))).toBe(6)
  })

  it('shows only the part of a wall above a lower neighbour', () => {
    // A (1 step) east of nothing… B (2 steps): A's east wall is hidden by B, B's west wall shows one band.
    expect(
      quads(
        mapOf(2, 1, [
          { type: 'grass', h: 2 },
          { type: 'grass', h: 4 },
        ]),
      ),
    ).toBe(12)
  })

  it('draws water as a dropped, see-through top with no walls', () => {
    const parts = buildChunk(mapOf(1, 1, [{ type: 'water', h: 0 }]), 0, 0)
    expect(quadCount(parts)).toBe(1)
    expect(parts[0].water).toBe(true)
    const ys = parts[0].positions.filter((_, i) => i % 3 === 1)
    expect(Math.max(...ys)).toBeCloseTo(-WATER_DROP)
  })

  it('draws a floating overhang as a cube and hides a buried one', () => {
    const m = mapOf(1, 1, [{ type: 'grass', h: 2 }])
    m.overhangs['0,2,0'] = { type: 'stone' }
    expect(quads(m)).toBe(5 + 6)
    m.overhangs = { '0,0,0': { type: 'stone' } } // inside the column
    expect(quads(m)).toBe(5)
  })

  it('maps every quad back to its tile and face', () => {
    const parts = buildChunk(mapOf(1, 1, [{ type: 'grass', h: 2 }]), 0, 0)
    for (const p of parts) {
      expect(p.indices.length).toBe(p.faces.length * 6)
      expect(p.positions.length).toBe(p.faces.length * 12)
    }
    const faces = parts.flatMap((p) => p.faces.map((f) => f.face)).sort()
    expect(faces).toEqual(['e', 'n', 's', 'top', 'w'])
  })

  it('puts auto-generated sides in their own texture group', () => {
    const m = mapOf(1, 1, [{ type: 'grass', h: 2 }])
    m.tileTypes = m.tileTypes.map((t) => (t.id === 'grass' ? { ...t, sideMode: 'auto' } : t))
    const textures = buildChunk(m, 0, 0)
      .map((p) => p.texture)
      .sort()
    expect(textures).toEqual(['auto:builtin', 'builtin'])
  })

  it('finds the chunks an edit touches, including the border ring', () => {
    const m = newMapDoc('t', { x: CHUNK * 2, z: CHUNK })
    expect(chunksOf(m)).toEqual([
      [0, 0],
      [1, 0],
    ])
    const inside = produce(m, (d) => setTile(d, 3, 3, { type: 'stone', h: 4 }))
    expect([...dirtyChunks(m, inside)]).toEqual(['0,0'])
    const edge = produce(m, (d) => setTile(d, CHUNK - 1, 0, { type: 'stone', h: 4 }))
    expect([...dirtyChunks(m, edge)].sort()).toEqual(['0,0', '1,0'])
    const retyped = produce(m, (d) => {
      d.tileTypes[0].name = 'Lawn'
    })
    expect(dirtyChunks(m, retyped).size).toBe(2)
  })
})
