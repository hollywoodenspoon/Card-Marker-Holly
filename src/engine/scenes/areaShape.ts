/** A click area's paths as a Vector Maker drawing (to edit with the pen), and back. Pure. */
import type { SubPath } from '@/vector/geometry'
import { allItems, newDoc, newLayer, newPath, type VectorDoc } from '@/vector/model'
import type { PictureScene } from '../model/game'

export function areaDoc(scene: Pick<PictureScene, 'width' | 'height'>, paths: SubPath[]) {
  const doc = newDoc(scene.width, scene.height)
  doc.layers = [newLayer('Click area')]
  if (paths.length)
    doc.layers[0].items.push(
      newPath('Area', structuredClone(paths), {
        fill: '#ffd27a',
        stroke: '#1f1f24',
        strokeWidth: 2,
        opacity: 0.5,
        lineJoin: 'round',
        lineCap: 'round',
      }),
    )
  return doc
}

export function areaPaths(doc: VectorDoc): SubPath[] {
  return allItems(doc)
    .filter(({ layer, item }) => layer.visible && !item.hidden)
    .flatMap(({ item }) => item.subpaths)
    .filter((sp) => sp.anchors.length >= 2)
}
