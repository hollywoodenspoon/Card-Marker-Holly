/**
 * Builds the block meshes for a map. One InstancedMesh per block type that is
 * actually used, so the whole map draws in a handful of calls regardless of how
 * many blocks it has — the key to staying smooth on low-end hardware. Greedy
 * face-merging can come later; instancing already keeps draw calls flat.
 */
import {
  BoxGeometry,
  Group,
  InstancedMesh,
  type Intersection,
  Matrix4,
  MeshLambertMaterial,
  type Raycaster,
  type Texture,
} from 'three'
import { type Cell, type MapDoc, parseCellKey } from '../model/map'
import { tileTexture } from './textures'

const geometry = new BoxGeometry(1, 1, 1)

export interface BuiltBlocks {
  group: Group
  /** The cell under the ray, if the ray hits a block face, else undefined. */
  pick: (raycaster: Raycaster) => { cell: Cell; normal: Cell } | undefined
  dispose: () => void
}

/** Create the meshes for `map`. Call `dispose()` before rebuilding. */
export function buildBlocks(map: MapDoc): BuiltBlocks {
  const group = new Group()
  const textures: Texture[] = []
  const materials: MeshLambertMaterial[] = []
  // Group cells by block type so each type is one instanced draw.
  const byType = new Map<string, Cell[]>()
  for (const key of Object.keys(map.blocks)) {
    const type = map.blocks[key].type
    const list = byType.get(type) ?? []
    list.push(parseCellKey(key))
    byType.set(type, list)
  }
  const colorOf = (id: string) => map.palette.blocks.find((b) => b.id === id)?.color ?? '#b06fb0'
  const meshCells: Cell[][] = []
  const m = new Matrix4()
  for (const [type, cells] of byType) {
    const tex = tileTexture(colorOf(type))
    const mat = new MeshLambertMaterial({ map: tex })
    textures.push(tex)
    materials.push(mat)
    const mesh = new InstancedMesh(geometry, mat, cells.length)
    cells.forEach((c, i) => {
      m.makeTranslation(c.x + 0.5, c.y + 0.5, c.z + 0.5)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.userData.meshIndex = meshCells.length
    meshCells.push(cells)
    group.add(mesh)
  }

  return {
    group,
    pick: (raycaster) => {
      const hits = raycaster.intersectObjects(group.children, false) as Intersection[]
      const hit = hits[0]
      if (!hit || hit.instanceId === undefined) return undefined
      const meshIndex = hit.object.userData.meshIndex as number
      const cell = meshCells[meshIndex][hit.instanceId]
      // The hit face normal, rounded to a unit cell step.
      const n = hit.face?.normal ?? { x: 0, y: 1, z: 0 }
      const normal = { x: Math.round(n.x), y: Math.round(n.y), z: Math.round(n.z) }
      return { cell, normal }
    },
    dispose: () => {
      materials.forEach((mat) => mat.dispose())
      textures.forEach((tex) => tex.dispose())
    },
  }
}
