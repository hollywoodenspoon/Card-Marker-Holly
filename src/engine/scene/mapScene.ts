/**
 * The map in Three.js: one mesh per texture group per chunk, rebuilt only for
 * the chunks an edit touches, with materials shared across chunks. Knows how to
 * turn a raycast hit back into a tile and face, and reports draw stats for the
 * performance meter. Shared by every viewport pane.
 */
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  type Intersection,
  type Material,
  Mesh,
  MeshLambertMaterial,
  type Raycaster,
} from 'three'
import type { MapDoc } from '../model/map'
import { buildChunk, chunksOf, dirtyChunks, type FaceInfo, type MeshPart } from './chunkMesh'
import type { TextureStore } from './textureStore'

export type Vec3 = [number, number, number]

/** What the cursor is over: the face, its four corners in world space, and its normal. */
export interface FacePick {
  info: FaceInfo
  corners: [Vec3, Vec3, Vec3, Vec3]
  normal: Vec3
  point: Vec3
}

export class MapScene {
  readonly group = new Group()
  private chunks = new Map<string, Mesh[]>()
  private materials = new Map<string, Material>()
  private map: MapDoc | null = null
  /** Milliseconds the last rebuild took (for the perf meter). */
  lastBuildMs = 0

  constructor(private textures: TextureStore) {}

  setMap(next: MapDoc) {
    const t0 = performance.now()
    const prev = this.map
    this.map = next
    const keys =
      !prev || prev.id !== next.id
        ? new Set(chunksOf(next).map(([a, b]) => `${a},${b}`))
        : dirtyChunks(prev, next)
    if (!prev || prev.id !== next.id || prev.size !== next.size) this.clearAll()
    for (const key of keys) this.buildChunk(key)
    this.lastBuildMs = performance.now() - t0
  }

  private material(part: MeshPart): Material {
    const key = `${part.texture}|${part.water ? 'w' : ''}`
    let m = this.materials.get(key)
    if (!m) {
      const map = this.textures.get(part.texture, this.map!.tilesets)
      m = part.water
        ? new MeshLambertMaterial({ map, transparent: true, opacity: 0.72, depthWrite: false })
        : new MeshLambertMaterial({ map, side: DoubleSide })
      this.materials.set(key, m)
    }
    return m
  }

  private buildChunk(key: string) {
    for (const mesh of this.chunks.get(key) ?? []) {
      this.group.remove(mesh)
      mesh.geometry.dispose()
    }
    const [cx, cz] = key.split(',').map(Number)
    const meshes: Mesh[] = []
    for (const part of buildChunk(this.map!, cx, cz)) {
      const g = new BufferGeometry()
      g.setAttribute('position', new BufferAttribute(new Float32Array(part.positions), 3))
      g.setAttribute('normal', new BufferAttribute(new Float32Array(part.normals), 3))
      g.setAttribute('uv', new BufferAttribute(new Float32Array(part.uvs), 2))
      g.setIndex(new BufferAttribute(new Uint32Array(part.indices), 1))
      g.computeBoundingSphere()
      const mesh = new Mesh(g, this.material(part))
      mesh.userData.part = part
      if (part.water) mesh.renderOrder = 1
      meshes.push(mesh)
      this.group.add(mesh)
    }
    this.chunks.set(key, meshes)
  }

  private clearAll() {
    for (const meshes of this.chunks.values())
      for (const m of meshes) {
        this.group.remove(m)
        m.geometry.dispose()
      }
    this.chunks.clear()
  }

  /** The face under a ray, solid faces before water. */
  pick(raycaster: Raycaster): FacePick | undefined {
    const hits = raycaster.intersectObjects(this.group.children, false) as Intersection<Mesh>[]
    const hit = hits.find((h) => !(h.object.userData.part as MeshPart).water) ?? hits[0]
    if (!hit || hit.faceIndex === undefined || hit.faceIndex === null) return undefined
    const part = hit.object.userData.part as MeshPart
    const quad = Math.floor(hit.faceIndex / 2)
    const p = part.positions
    const corner = (i: number): Vec3 => [
      p[(quad * 4 + i) * 3],
      p[(quad * 4 + i) * 3 + 1],
      p[(quad * 4 + i) * 3 + 2],
    ]
    const n = part.normals
    return {
      info: part.faces[quad],
      corners: [corner(0), corner(1), corner(2), corner(3)],
      normal: [n[quad * 12], n[quad * 12 + 1], n[quad * 12 + 2]],
      point: [hit.point.x, hit.point.y, hit.point.z],
    }
  }

  /** Draw calls and quads currently built (for the perf meter). */
  stats(): { drawCalls: number; faces: number } {
    let drawCalls = 0
    let faces = 0
    for (const meshes of this.chunks.values())
      for (const m of meshes) {
        drawCalls++
        faces += (m.userData.part as MeshPart).faces.length
      }
    return { drawCalls, faces }
  }

  /** Rebuild materials after a tileset image changes. */
  refreshTextures() {
    for (const m of this.materials.values()) m.dispose()
    this.materials.clear()
    if (this.map) {
      this.clearAll()
      for (const [a, b] of chunksOf(this.map)) this.buildChunk(`${a},${b}`)
    }
  }

  dispose() {
    this.clearAll()
    for (const m of this.materials.values()) m.dispose()
    this.materials.clear()
  }
}
