/**
 * The view cube in each pane's corner: a small labelled cube that turns with
 * the camera. Clicking a face, edge or corner points the camera from that
 * direction (see viewMath.cubeDirection). Drawn into a corner of the pane with
 * the shared renderer, from its own tiny scene.
 */
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  type Camera,
  DirectionalLight,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshLambertMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  type WebGLRenderer,
} from 'three'
import { cubeDirection } from './viewMath'

export const CUBE_PX = 84

function label(text: string): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#d9dde6'
  g.fillRect(0, 0, 128, 128)
  g.strokeStyle = '#8a93a6'
  g.lineWidth = 6
  g.strokeRect(3, 3, 122, 122)
  g.fillStyle = '#2b3140'
  g.font = 'bold 26px Inter, system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, 64, 66)
  const t = new CanvasTexture(c)
  t.anisotropy = 2
  return t
}

export class ViewCube {
  private scene = new Scene()
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
  private cube: Mesh
  private ray = new Raycaster()

  constructor() {
    // BoxGeometry face order: +x, −x, +y, −y, +z, −z. Front is the south side (+z).
    const names = ['RIGHT', 'LEFT', 'TOP', 'BOTTOM', 'FRONT', 'BACK']
    const mats = names.map((n) => new MeshLambertMaterial({ map: label(n) }))
    const geo = new BoxGeometry(1, 1, 1)
    this.cube = new Mesh(geo, mats)
    this.scene.add(this.cube)
    this.scene.add(
      new LineSegments(new EdgesGeometry(geo), new LineBasicMaterial({ color: 0x5b6478 })),
    )
    this.scene.add(new AmbientLight(0xffffff, 1.6))
    const key = new DirectionalLight(0xffffff, 1.2)
    key.position.set(2, 3, 4)
    this.scene.add(key)
  }

  /** Turn the mini camera to match the pane's camera. */
  private sync(main: Camera) {
    this.camera.quaternion.copy(main.quaternion)
    this.camera.position.set(0, 0, 3).applyQuaternion(main.quaternion)
    this.camera.updateMatrixWorld()
  }

  /** Draw in the pane's top-right corner. `x, y` are the pane's bottom-left in canvas CSS px. */
  render(
    renderer: WebGLRenderer,
    main: Camera,
    paneX: number,
    paneY: number,
    paneW: number,
    paneH: number,
  ) {
    this.sync(main)
    const x = paneX + paneW - CUBE_PX - 6
    const y = paneY + paneH - CUBE_PX - 6
    renderer.setViewport(x, y, CUBE_PX, CUBE_PX)
    renderer.setScissor(x, y, CUBE_PX, CUBE_PX)
    renderer.clearDepth()
    renderer.render(this.scene, this.camera)
  }

  /**
   * The direction picked at a point inside the cube's square (0–1 from its
   * top-left), or null when the cube isn't under the pointer.
   */
  hit(main: Camera, u: number, v: number): [number, number, number] | null {
    this.sync(main)
    this.ray.setFromCamera(new Vector2(u * 2 - 1, -(v * 2 - 1)), this.camera)
    const h = this.ray.intersectObject(this.cube, false)[0]
    if (!h) return null
    const p = this.cube.worldToLocal(h.point.clone()) as Vector3
    return cubeDirection([p.x, p.y, p.z])
  }
}
