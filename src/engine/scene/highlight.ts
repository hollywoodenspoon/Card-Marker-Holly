/**
 * Face highlights: a square outline around exactly one face (a top, or one
 * band of a side wall), lifted a hair off the surface so it never flickers.
 * Gold follows the cursor; cyan marks the inspected tile.
 */
import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineLoop } from 'three'

type V3 = [number, number, number]

export function makeFaceOutline(color = 0xffd36b): LineLoop {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(12), 3))
  const line = new LineLoop(
    g,
    new LineBasicMaterial({ color, depthTest: false, transparent: true }),
  )
  line.renderOrder = 999
  line.frustumCulled = false
  line.visible = false
  return line
}

/** Put the outline on a face's four corners, nudged along its normal. */
export function setFaceOutline(line: LineLoop, corners: [V3, V3, V3, V3], normal: V3) {
  const pos = line.geometry.getAttribute('position') as BufferAttribute
  const lift = 0.012
  corners.forEach((c, i) =>
    pos.setXYZ(i, c[0] + normal[0] * lift, c[1] + normal[1] * lift, c[2] + normal[2] * lift),
  )
  pos.needsUpdate = true
  line.geometry.computeBoundingSphere()
  line.visible = true
}
