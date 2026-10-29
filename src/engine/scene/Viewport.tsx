/**
 * The 3D editor viewport: a Three.js scene showing the map's blocks with an
 * orbit/pan/zoom camera. Rendering is on-demand (only after the camera moves,
 * the map changes, or the view resizes) so an idle editor uses no GPU — which
 * matters on the low-end machines the engine targets.
 */
import { useEffect, useRef } from 'react'
import {
  Color,
  DirectionalLight,
  GridHelper,
  HemisphereLight,
  type Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  Vector2,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { useEngine } from '../store/engineStore'
import { buildBlocks, type BuiltBlocks } from './blocks'
import { makeHighlight, moveHighlight } from './highlight'

/** Read the editor backdrop colour from the theme's `--canvas` token. */
function canvasColor(el: HTMLElement): Color {
  const value = getComputedStyle(el).getPropertyValue('--canvas').trim()
  const probe = new Color()
  try {
    probe.set(value || '#1c1c1f')
  } catch {
    probe.set('#1c1c1f')
  }
  return probe
}

export function Viewport() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = ref.current!
    const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    host.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'

    const scene = new Scene()
    scene.background = canvasColor(host)

    const camera = new PerspectiveCamera(50, 1, 0.1, 2000)
    camera.position.set(18, 20, 24)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.12
    controls.maxPolarAngle = Math.PI * 0.49 // never drop below the ground plane
    controls.target.set(8, 1, 8)

    // Soft sky/ground fill plus one key light gives blocks their FF-Tactics shading.
    scene.add(new HemisphereLight(0xffffff, 0x404050, 1.1))
    const sun = new DirectionalLight(0xffffff, 1.4)
    sun.position.set(12, 24, 8)
    scene.add(sun)

    const grid = new GridHelper(64, 64, 0x888888, 0x444444)
    ;(grid.material as { opacity: number; transparent: boolean }).opacity = 0.25
    ;(grid.material as { transparent: boolean }).transparent = true
    grid.position.set(32, 0, 32)
    scene.add(grid)

    const highlight = makeHighlight()
    highlight.visible = false
    scene.add(highlight)

    let built: BuiltBlocks | null = null
    const rebuild = (map = useEngine.getState().map) => {
      if (built) {
        scene.remove(built.group)
        built.dispose()
      }
      built = buildBlocks(map)
      scene.add(built.group)
      invalidate()
    }

    // On-demand rendering: render once per frame only when something changed.
    let needsRender = true
    const invalidate = () => {
      needsRender = true
    }
    controls.addEventListener('change', invalidate)

    const resize = () => {
      const w = host.clientWidth || 1
      const h = host.clientHeight || 1
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      invalidate()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    // Hover highlight: raycast the cursor against the blocks.
    const raycaster = new Raycaster()
    const ndc = new Vector2()
    const onMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(ndc, camera)
      const hit = built?.pick(raycaster)
      if (hit) {
        moveHighlight(highlight, hit.cell)
        highlight.visible = true
      } else {
        highlight.visible = false
      }
      invalidate()
    }
    const onLeave = () => {
      highlight.visible = false
      invalidate()
    }
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerleave', onLeave)

    // Keep the backdrop in step with theme changes.
    const themeObserver = new MutationObserver(() => {
      scene.background = canvasColor(host)
      invalidate()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })

    const unsub = useEngine.subscribe((s, prev) => {
      if (s.map !== prev.map) rebuild(s.map)
    })

    rebuild()
    resize()

    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const damping = controls.update() // returns true while still easing
      if (needsRender || damping) {
        renderer.render(scene, camera)
        needsRender = false
      }
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      unsub()
      ro.disconnect()
      themeObserver.disconnect()
      controls.removeEventListener('change', invalidate)
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      controls.dispose()
      built?.dispose()
      disposeTree(scene)
      renderer.dispose()
      host.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={ref} className="h-full w-full" style={{ background: 'var(--canvas)' }} />
}

/** Free geometries/materials the scene still holds (lights and helpers mostly). */
function disposeTree(root: Object3D) {
  root.traverse((o) => {
    const mesh = o as { geometry?: { dispose: () => void }; material?: { dispose: () => void } }
    mesh.geometry?.dispose?.()
    mesh.material?.dispose?.()
  })
}
