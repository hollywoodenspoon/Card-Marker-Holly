/**
 * Builds the triangles for one chunk of a map: only the faces you can see.
 * A column's top always shows; a side shows only where its neighbour is lower;
 * a slope's top is a tilted quad and its sides follow the corners. Faces are
 * grouped by texture (one tileset, or its auto-generated sides; water apart, as
 * it's see-through), so a chunk draws in a handful of calls.
 *
 * Pure: arrays in, arrays out, no Three.js. The renderer wraps the arrays in
 * BufferGeometry; tests count faces. `faces` lists one entry per quad (two
 * triangles), so a raycast's faceIndex maps straight back to a tile and side.
 */
import {
  cornerHeights,
  type Dir,
  DIRS,
  edgeHeights,
  kindOf,
  type MapDoc,
  neighbourEdge,
  parseCellKey,
  sideRef,
  tileAt,
  topRef,
  typeOf,
  type Cell,
} from '../model/map'
import { BUILTIN_TILESET, type TileRef, type Tileset, tileUv } from '../model/tileset'

export const CHUNK = 16

/** Which face of what a quad belongs to. */
export interface FaceInfo {
  x: number
  z: number
  face: 'top' | 'bottom' | Dir
  /** Set when the face belongs to an overhang block rather than a column. */
  overhang?: Cell
}

export interface MeshPart {
  /** The texture: a tileset id, or `auto:<tileset id>` for generated sides. */
  texture: string
  water: boolean
  positions: number[]
  normals: number[]
  uvs: number[]
  indices: number[]
  faces: FaceInfo[]
}

/** Water tops sit a little below their tile so the bank shows. */
export const WATER_DROP = 0.12

type V3 = [number, number, number]
type V2 = [number, number]

class Builder {
  parts = new Map<string, MeshPart>()
  constructor(private tilesets: Map<string, Tileset>) {}

  private part(texture: string, water: boolean): MeshPart {
    const key = `${texture}|${water ? 'w' : ''}`
    let p = this.parts.get(key)
    if (!p) {
      p = { texture, water, positions: [], normals: [], uvs: [], indices: [], faces: [] }
      this.parts.set(key, p)
    }
    return p
  }

  tileset(id: string): Tileset {
    return this.tilesets.get(id) ?? this.tilesets.get(BUILTIN_TILESET)!
  }

  /** A quad (v0,v1,v2),(v0,v2,v3), front-facing counter-clockwise. */
  quad(
    ref: TileRef,
    auto: boolean,
    water: boolean,
    v: [V3, V3, V3, V3],
    uv: [V2, V2, V2, V2],
    info: FaceInfo,
  ) {
    const ts = this.tileset(ref.tileset)
    const p = this.part(auto ? `auto:${ts.id}` : ts.id, water)
    const n = normal(v[0], v[1], v[2])
    const base = p.positions.length / 3
    for (let i = 0; i < 4; i++) {
      p.positions.push(...v[i])
      p.normals.push(...n)
      p.uvs.push(...uv[i])
    }
    p.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
    p.faces.push(info)
  }

  uv(ref: TileRef) {
    return tileUv(this.tileset(ref.tileset), ref.index)
  }
}

function normal(a: V3, b: V3, c: V3): V3 {
  const ux = b[0] - a[0]
  const uy = b[1] - a[1]
  const uz = b[2] - a[2]
  const vx = c[0] - a[0]
  const vy = c[1] - a[1]
  const vz = c[2] - a[2]
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  const len = Math.hypot(nx, ny, nz) || 1
  return [nx / len, ny / len, nz / len]
}

/** The two ends of a side, left→right as seen from outside, in xz. */
function sideEnds(x: number, z: number, dir: Dir): [V2, V2] {
  switch (dir) {
    case 'n':
      return [
        [x + 1, z],
        [x, z],
      ]
    case 'e':
      return [
        [x + 1, z + 1],
        [x + 1, z],
      ]
    case 's':
      return [
        [x, z + 1],
        [x + 1, z + 1],
      ]
    case 'w':
      return [
        [x, z],
        [x, z + 1],
      ]
  }
}

/**
 * Emit a side wall between bottom (bl, br) and top (tl, tr) heights, in world
 * units, at the edge L→R. A flat-topped wall is cut into one-step bands from the
 * top down, so each band's top lines up with the tile's top edge: the first band
 * shows `refTop` (a grass edge), the ones below `refLower` (dirt), as in FF
 * Tactics. A sloped edge is one stretched quad of `refTop`.
 */
function wall(
  b: Builder,
  refTop: TileRef,
  refLower: TileRef,
  auto: boolean,
  [L, R]: [V2, V2],
  bl: number,
  br: number,
  tl: number,
  tr: number,
  info: FaceInfo,
) {
  if (tl <= bl && tr <= br) return
  if (!(tl === tr && bl === br)) {
    const { u0, u1, v0, v1 } = b.uv(refTop)
    b.quad(
      refTop,
      auto,
      false,
      [
        [L[0], bl, L[1]],
        [R[0], br, R[1]],
        [R[0], tr, R[1]],
        [L[0], tl, L[1]],
      ],
      [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ],
      info,
    )
    return
  }
  let top = tl
  let first = true
  while (top > bl + 1e-6) {
    const bottom = Math.max(bl, top - 1)
    const ref = first ? refTop : refLower
    const { u0, u1, v0, v1 } = b.uv(ref)
    const vb = v1 - (v1 - v0) * (top - bottom)
    b.quad(
      ref,
      auto,
      false,
      [
        [L[0], bottom, L[1]],
        [R[0], bottom, R[1]],
        [R[0], top, R[1]],
        [L[0], top, L[1]],
      ],
      [
        [u0, vb],
        [u1, vb],
        [u1, v1],
        [u0, v1],
      ],
      info,
    )
    top = bottom
    first = false
  }
}

/** Build every visible face for the chunk at (cx, cz). */
export function buildChunk(map: MapDoc, cx: number, cz: number): MeshPart[] {
  const b = new Builder(new Map(map.tilesets.map((t) => [t.id, t])))
  const x0 = cx * CHUNK
  const z0 = cz * CHUNK
  for (let z = z0; z < Math.min(z0 + CHUNK, map.size.z); z++)
    for (let x = x0; x < Math.min(x0 + CHUNK, map.size.x); x++) {
      const tile = tileAt(map, x, z)
      if (!tile) continue
      const water = kindOf(map, tile) === 'water'
      const [nw, ne, se, sw] = cornerHeights(tile).map((h) => h / 2 - (water ? WATER_DROP : 0))
      const top = topRef(map, tile)
      const t = b.uv(top)
      b.quad(
        top,
        false,
        water,
        [
          [x, nw, z],
          [x, sw, z + 1],
          [x + 1, se, z + 1],
          [x + 1, ne, z],
        ],
        [
          [t.u0, t.v1],
          [t.u0, t.v0],
          [t.u1, t.v0],
          [t.u1, t.v1],
        ],
        { x, z, face: 'top' },
      )
      if (water) continue // water has no walls; the bank's walls show instead
      for (const dir of DIRS) {
        const [l, r] = edgeHeights(tile, dir).map((h) => h / 2)
        const [nl, nr] = neighbourEdge(map, x, z, dir).map((h) => h / 2)
        const side = sideRef(map, tile, dir)
        wall(
          b,
          side.ref,
          side.lower,
          side.auto,
          sideEnds(x, z, dir),
          Math.min(nl, l),
          Math.min(nr, r),
          l,
          r,
          { x, z, face: dir },
        )
      }
    }
  buildOverhangs(b, map, x0, z0)
  return [...b.parts.values()]
}

/** Detached blocks: unit cubes, culled against each other and against buried cells. */
function buildOverhangs(b: Builder, map: MapDoc, x0: number, z0: number) {
  const has = (x: number, y: number, z: number) => !!map.overhangs[`${x},${y},${z}`]
  const buried = (x: number, y: number, z: number) => {
    const t = tileAt(map, x, z)
    return !!t && Math.min(...cornerHeights(t)) / 2 >= y + 1
  }
  for (const [key, block] of Object.entries(map.overhangs)) {
    const c = parseCellKey(key)
    if (c.x < x0 || c.z < z0 || c.x >= x0 + CHUNK || c.z >= z0 + CHUNK) continue
    if (buried(c.x, c.y, c.z)) continue
    const type = typeOf(map, block.type)
    const topT = type?.top ?? { tileset: BUILTIN_TILESET, index: 0 }
    const sideT = type?.side ?? topT
    const botT = type?.bottom ?? topT
    const { x, y, z } = c
    const info = (face: FaceInfo['face']): FaceInfo => ({ x, z, face, overhang: c })
    if (!has(x, y + 1, z)) {
      const t = b.uv(topT)
      b.quad(
        topT,
        false,
        false,
        [
          [x, y + 1, z],
          [x, y + 1, z + 1],
          [x + 1, y + 1, z + 1],
          [x + 1, y + 1, z],
        ],
        [
          [t.u0, t.v1],
          [t.u0, t.v0],
          [t.u1, t.v0],
          [t.u1, t.v1],
        ],
        info('top'),
      )
    }
    if (!has(x, y - 1, z) && !buried(x, y - 1, z) && y > 0) {
      const t = b.uv(botT)
      b.quad(
        botT,
        false,
        false,
        [
          [x, y, z],
          [x + 1, y, z],
          [x + 1, y, z + 1],
          [x, y, z + 1],
        ],
        [
          [t.u0, t.v1],
          [t.u1, t.v1],
          [t.u1, t.v0],
          [t.u0, t.v0],
        ],
        info('bottom'),
      )
    }
    const steps: Record<Dir, [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] }
    for (const dir of DIRS) {
      const [dx, dz] = steps[dir]
      if (has(x + dx, y, z + dz) || buried(x + dx, y, z + dz)) continue
      wall(b, sideT, sideT, false, sideEnds(x, z, dir), y, y, y + 1, y + 1, info(dir))
    }
  }
}

/** Every chunk coordinate of a map. */
export function chunksOf(map: MapDoc): [number, number][] {
  const out: [number, number][] = []
  for (let cz = 0; cz < Math.ceil(map.size.z / CHUNK); cz++)
    for (let cx = 0; cx < Math.ceil(map.size.x / CHUNK); cx++) out.push([cx, cz])
  return out
}

/** Quads (faces) in a chunk build — for tests and the perf meter. */
export const quadCount = (parts: MeshPart[]) => parts.reduce((n, p) => n + p.faces.length, 0)

/**
 * The chunks an edit can touch: those whose tiles (or the ring of tiles just
 * around them, which decide side culling) changed identity between two maps.
 * immer keeps untouched tiles as the same objects, so this is a quick scan.
 */
export function dirtyChunks(prev: MapDoc, next: MapDoc): Set<string> {
  const all = () => new Set(chunksOf(next).map(([a, c]) => `${a},${c}`))
  if (
    prev.size.x !== next.size.x ||
    prev.size.z !== next.size.z ||
    prev.tileTypes !== next.tileTypes ||
    prev.tilesets !== next.tilesets
  )
    return all()
  const dirty = new Set<string>()
  const mark = (x: number, z: number) => {
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx
        const zz = z + dz
        if (xx < 0 || zz < 0 || xx >= next.size.x || zz >= next.size.z) continue
        dirty.add(`${Math.floor(xx / CHUNK)},${Math.floor(zz / CHUNK)}`)
      }
  }
  if (prev.tiles !== next.tiles)
    for (let i = 0; i < next.tiles.length; i++)
      if (prev.tiles[i] !== next.tiles[i]) mark(i % next.size.x, Math.floor(i / next.size.x))
  if (prev.overhangs !== next.overhangs) {
    const keys = new Set([...Object.keys(prev.overhangs), ...Object.keys(next.overhangs)])
    for (const k of keys)
      if (prev.overhangs[k] !== next.overhangs[k]) {
        const c = parseCellKey(k)
        mark(c.x, c.z)
      }
  }
  return dirty
}
