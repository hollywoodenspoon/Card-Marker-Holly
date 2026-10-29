/**
 * The hover highlight: a thin wireframe box drawn around the cell under the
 * cursor. It proves picking works in PR1 and is what the editing tools (PR2)
 * will anchor to.
 */
import { BoxGeometry, EdgesGeometry, LineBasicMaterial, LineSegments } from 'three'
import type { Cell } from '../model/map'

export function makeHighlight(): LineSegments {
  const edges = new EdgesGeometry(new BoxGeometry(1.02, 1.02, 1.02))
  const material = new LineBasicMaterial({ color: 0xffd36b, depthTest: false })
  const lines = new LineSegments(edges, material)
  lines.renderOrder = 999
  return lines
}

/** Centre the highlight on a cell (cells fill the unit cube at their origin). */
export function moveHighlight(lines: LineSegments, c: Cell) {
  lines.position.set(c.x + 0.5, c.y + 0.5, c.z + 0.5)
}
