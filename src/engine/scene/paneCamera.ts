/**
 * One viewport pane's camera: a perspective and an orthographic camera that
 * swap while keeping the view, orbit/pan/zoom controls on the pane, the named
 * views (Top, Front… User, Game camera), FOV changes that keep the framing, and
 * short animated moves for the view cube and the Game camera's 90° turns.
 */
import { MOUSE, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  AXIS_DIRS,
  AXIS_VIEWS,
  clampFov,
  distanceForFov,
  gameOffset,
  viewHeight,
  type ViewName,
} from './viewMath'

const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export interface GameCam {
  fov: number
  yaw: number
  tilt: number
}

export class PaneCamera {
  readonly persp = new PerspectiveCamera(50, 1, 0.05, 4000)
  readonly ortho = new OrthographicCamera(-10, 10, 10, -10, -2000, 4000)
  readonly controls: OrbitControls
  view: ViewName = 'persp'
  isOrtho = false
  fov = 50
  game: GameCam = { fov: 50, yaw: 0, tilt: 0.55 }
  private aspect = 1
  private halfHeight = 10
  private anim: {
    from: Vector3
    to: Vector3
    fromT: Vector3
    toT: Vector3
    start: number
    ms: number
  } | null = null

  constructor(
    dom: HTMLElement,
    target: Vector3,
    private onChange: () => void,
  ) {
    this.persp.position.set(target.x + 12, target.y + 14, target.z + 18)
    this.controls = new OrbitControls(this.persp, dom)
    this.controls.target.copy(target)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.15
    this.controls.zoomToCursor = true
    this.controls.addEventListener('change', onChange)
    this.applyLocks()
  }

  get camera(): PerspectiveCamera | OrthographicCamera {
    return this.isOrtho ? this.ortho : this.persp
  }

  private get distance() {
    return this.camera.position.distanceTo(this.controls.target)
  }

  /** Rotation and mouse-button rules for the current view. */
  private applyLocks() {
    const free = this.view === 'persp' || this.view === 'user'
    const c = this.controls
    c.enableRotate = free
    c.maxPolarAngle = free ? Math.PI * 0.495 : Math.PI
    c.mouseButtons = {
      LEFT: null as unknown as MOUSE, // the tool
      MIDDLE: MOUSE.PAN,
      RIGHT: free ? MOUSE.ROTATE : MOUSE.PAN,
    }
  }

  /** Place the camera for a named view, keeping the target and distance. */
  setView(view: ViewName, animate = true) {
    const prev = this.view
    this.view = view
    const d = Math.max(this.distance, 4)
    const t = this.controls.target.clone()
    let pos: Vector3 | null = null
    if (AXIS_VIEWS.includes(view)) {
      const [x, y, z] = AXIS_DIRS[view]
      // A hair off the axis so "up" on screen is north (top) / stays defined.
      pos = new Vector3(x, y, z).multiplyScalar(d).add(t)
      if (view === 'top' || view === 'bottom') pos.z += 0.001
      this.setOrtho(true, false)
    } else if (view === 'game') {
      this.fov = this.game.fov
      this.persp.fov = this.fov
      this.persp.updateProjectionMatrix()
      const [x, y, z] = gameOffset(this.game.yaw, this.game.tilt, d)
      pos = new Vector3(x, y, z).add(t)
      this.setOrtho(false, false)
    } else if (view === 'persp' && AXIS_VIEWS.includes(prev)) {
      // Leaving an axis view: back to a three-quarter view.
      pos = new Vector3(0.55, 0.6, 0.75).normalize().multiplyScalar(d).add(t)
      this.setOrtho(false, false)
    }
    this.applyLocks()
    if (pos) this.moveTo(pos, t, animate)
    this.onChange()
  }

  /** Switch projection; the visible size at the target stays the same. */
  setOrtho(on: boolean, notify = true) {
    if (on === this.isOrtho) return
    const target = this.controls.target
    if (on) {
      const d = this.persp.position.distanceTo(target)
      this.halfHeight = viewHeight(d, this.fov) / 2
      this.ortho.position.copy(this.persp.position)
      this.ortho.quaternion.copy(this.persp.quaternion)
      this.ortho.zoom = 1
    } else {
      const visible = (this.halfHeight * 2) / this.ortho.zoom
      const d = visible / (2 * Math.tan((this.fov * Math.PI) / 360))
      const dir = this.ortho.position.clone().sub(target).normalize()
      this.persp.position.copy(target).addScaledVector(dir, d)
      this.persp.quaternion.copy(this.ortho.quaternion)
    }
    this.isOrtho = on
    this.controls.object = this.camera
    this.resize(this.aspect)
    this.controls.update()
    if (notify) this.onChange()
  }

  /** Change the field of view; the camera moves so the framing holds. */
  setFov(next: number) {
    const fov = clampFov(next)
    if (fov === this.fov) return
    if (!this.isOrtho) {
      const t = this.controls.target
      const dir = this.persp.position.clone().sub(t).normalize()
      const d = distanceForFov(this.persp.position.distanceTo(t), this.fov, fov)
      this.persp.position.copy(t).addScaledVector(dir, d)
    }
    this.fov = fov
    this.persp.fov = fov
    this.persp.updateProjectionMatrix()
    if (this.view === 'game') this.game = { ...this.game, fov }
    this.controls.update()
    this.onChange()
  }

  /** Turn the Game camera a quarter turn (±1) around its target. */
  turnGame(steps: number) {
    if (this.view !== 'game') return
    this.game = { ...this.game, yaw: (((this.game.yaw + steps) % 4) + 4) % 4 }
    this.setView('game')
  }

  setGameTilt(tilt: number) {
    this.game = { ...this.game, tilt: Math.max(0, Math.min(1, tilt)) }
    if (this.view === 'game') this.setView('game', false)
  }

  /** Point the camera from `dir` (a unit vector from the target), e.g. from the view cube. */
  lookFrom(dir: [number, number, number]) {
    const t = this.controls.target.clone()
    const d = Math.max(this.distance, 4)
    const pos = new Vector3(...dir).multiplyScalar(d).add(t)
    if (Math.abs(dir[1]) > 0.999) pos.z += 0.001
    const axis = Object.entries(AXIS_DIRS).find(
      ([, v]) => v[0] === dir[0] && v[1] === dir[1] && v[2] === dir[2],
    )
    this.view = axis ? (axis[0] as ViewName) : 'user'
    if (axis) this.setOrtho(true, false)
    this.applyLocks()
    this.moveTo(pos, t, true)
    this.onChange()
  }

  private moveTo(pos: Vector3, target: Vector3, animate: boolean) {
    if (!animate || reducedMotion()) {
      this.camera.position.copy(pos)
      this.controls.target.copy(target)
      this.camera.lookAt(target)
      this.controls.update()
      return
    }
    this.anim = {
      from: this.camera.position.clone(),
      to: pos,
      fromT: this.controls.target.clone(),
      toT: target,
      start: performance.now(),
      ms: 240,
    }
  }

  /** Frame the whole map. */
  frame(center: Vector3, radius: number) {
    this.controls.target.copy(center)
    const d = radius / Math.tan((this.fov * Math.PI) / 360)
    const dir = this.camera.position.clone().sub(center)
    if (dir.lengthSq() < 1e-6) dir.set(0.55, 0.6, 0.75)
    this.camera.position.copy(center).addScaledVector(dir.normalize(), d)
    this.halfHeight = radius
    this.ortho.zoom = 1
    this.resize(this.aspect)
    this.controls.update()
    this.onChange()
  }

  resize(aspect: number) {
    this.aspect = aspect || 1
    this.persp.aspect = this.aspect
    this.persp.updateProjectionMatrix()
    this.ortho.left = -this.halfHeight * this.aspect
    this.ortho.right = this.halfHeight * this.aspect
    this.ortho.top = this.halfHeight
    this.ortho.bottom = -this.halfHeight
    this.ortho.updateProjectionMatrix()
  }

  /** Advance animation and damping; true while the view is still moving. */
  update(): boolean {
    if (this.anim) {
      const a = this.anim
      const k = Math.min(1, (performance.now() - a.start) / a.ms)
      const e = 1 - Math.pow(1 - k, 3)
      this.camera.position.lerpVectors(a.from, a.to, e)
      this.controls.target.lerpVectors(a.fromT, a.toT, e)
      this.camera.lookAt(this.controls.target)
      if (k >= 1) this.anim = null
      this.controls.update()
      return true
    }
    return this.controls.update()
  }

  dispose() {
    this.controls.removeEventListener('change', this.onChange)
    this.controls.dispose()
  }
}
