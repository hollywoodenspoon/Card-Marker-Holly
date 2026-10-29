/**
 * Pure camera maths for the viewports, kept apart from Three.js so it's
 * testable: where each named view puts the camera, how far to move when the
 * FOV changes so the framing holds, the ortho size that matches a perspective
 * view, and the Game camera's diagonal turns.
 */

export type ViewName =
  'persp' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'user' | 'game' | '2d'

export const VIEW_LABELS: Record<ViewName, string> = {
  persp: 'Perspective',
  top: 'Top',
  bottom: 'Bottom',
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  user: 'User',
  game: 'Game camera',
  '2d': '2D',
}

/** Views that look straight along an axis (ortho by default, no free rotation). */
export const AXIS_VIEWS: ViewName[] = ['top', 'bottom', 'front', 'back', 'left', 'right']

export const FOV_MIN = 10
export const FOV_MAX = 120
export const FOV_STEP = 5
export const clampFov = (f: number) => Math.max(FOV_MIN, Math.min(FOV_MAX, Math.round(f)))

type V3 = [number, number, number]

/** Unit direction from the target to the camera for each axis view (x east, z south, y up). */
export const AXIS_DIRS: Record<string, V3> = {
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  front: [0, 0, 1], // from the south, looking north
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
}

const rad = (d: number) => (d * Math.PI) / 180

/**
 * The camera distance that keeps the same framing after a FOV change: the
 * visible height at the target, 2·d·tan(fov/2), stays the same.
 */
export function distanceForFov(distance: number, fromFov: number, toFov: number): number {
  return (distance * Math.tan(rad(fromFov) / 2)) / Math.tan(rad(toFov) / 2)
}

/** The visible height at the target for a perspective view (the ortho frustum height to match it). */
export const viewHeight = (distance: number, fov: number) => 2 * distance * Math.tan(rad(fov) / 2)

/**
 * The Game camera's offset from its target: one of four diagonal views
 * (yaw 0–3, turned in 90° steps), tilted from low (0) to high (1).
 */
export function gameOffset(yaw: number, tilt: number, distance: number): V3 {
  const azimuth = rad(45 + 90 * (((yaw % 4) + 4) % 4))
  // Angle up from the ground: low 30°, high 65°.
  const elevation = rad(30 + 35 * Math.max(0, Math.min(1, tilt)))
  const flat = Math.cos(elevation) * distance
  return [Math.sin(azimuth) * flat, Math.sin(elevation) * distance, Math.cos(azimuth) * flat]
}

/**
 * Snap a direction picked on the view cube to a face (1 axis), edge (2) or
 * corner (3), from a hit point on the unit cube (each coordinate in −0.5…0.5).
 */
export function cubeDirection(hit: V3, edge = 0.3): V3 {
  const dir = hit.map((c) => (Math.abs(c) > edge ? Math.sign(c) : 0)) as V3
  if (dir[0] === 0 && dir[1] === 0 && dir[2] === 0) {
    const i = hit.map(Math.abs).indexOf(Math.max(...hit.map(Math.abs)))
    dir[i] = Math.sign(hit[i]) || 1
  }
  const len = Math.hypot(...dir)
  return dir.map((c) => c / len) as V3
}
