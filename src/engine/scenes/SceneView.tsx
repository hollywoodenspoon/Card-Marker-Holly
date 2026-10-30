import { useState, type ReactNode } from 'react'
import { pathData } from '@/vector/geometry'
import { useGameCards } from '../cards/gameCards'
import type { ClickArea, Glow, PictureScene, SceneObject } from '../model/game'
import { glowOn } from './glow'
import { useImageUrl } from './images'

/** The light around a click area, drawn under the pointer or while pressed. */
export function AreaGlow({
  area,
  on,
}: {
  area: Pick<ClickArea, 'id' | 'paths' | 'glow'>
  on: boolean
}) {
  const g: Glow = area.glow
  if (!on || g.what === 'none') return null
  const id = `glow-${area.id}`
  const d = pathData(area.paths)
  return (
    <g pointerEvents="none" opacity={Math.max(0.05, Math.min(1, g.strength))}>
      <defs>
        <filter id={id} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={Math.max(0.5, g.softness / 2)} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={d}
        fillRule="evenodd"
        filter={`url(#${id})`}
        fill={g.what === 'fill' ? g.color : 'none'}
        fillOpacity={g.what === 'fill' ? 0.55 : 0}
        stroke={g.color}
        strokeWidth={g.what === 'edge' ? Math.max(2, g.softness / 5) : 1}
        strokeLinejoin="round"
      />
    </g>
  )
}

function ObjectPicture({ obj }: { obj: SceneObject }) {
  const faces = useGameCards((s) => s.open?.faces)
  const url = useImageUrl(obj.kind === 'image' || obj.kind === 'spot' ? obj.image : null)
  const href = obj.kind === 'card' && obj.cardId ? (faces?.[obj.cardId]?.front ?? null) : url
  if (!href) return null
  return (
    <image
      href={href}
      x={obj.x}
      y={obj.y}
      width={obj.w}
      height={obj.h}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
    />
  )
}

/**
 * A picture scene as SVG, in scene pixels: the background, the placed objects
 * (cards, pictures, characters) and the click areas. In `play`, areas are
 * invisible (only their glow shows) and clicks run their events; in `edit`, the
 * editor draws its own outlines and handles over it (`overlay`).
 */
export function SceneView({
  scene,
  mode,
  hidden,
  onAreaClick,
  onObjectClick,
  overlay,
  svgRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  className,
}: {
  scene: PictureScene
  mode: 'edit' | 'play'
  /** Objects hidden by Cause and Effect while playing. */
  hidden?: Record<string, boolean>
  onAreaClick?: (a: ClickArea) => void
  onObjectClick?: (o: SceneObject) => void
  overlay?: ReactNode
  svgRef?: React.Ref<SVGSVGElement>
  onPointerDown?: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerMove?: (e: React.PointerEvent<SVGSVGElement>) => void
  onPointerUp?: (e: React.PointerEvent<SVGSVGElement>) => void
  className?: string
}) {
  const bg = useImageUrl(scene.background)
  const [hover, setHover] = useState<string | null>(null)
  const [press, setPress] = useState<string | null>(null)
  const [touch, setTouch] = useState(false)
  const play = mode === 'play'
  const visible = (o: SceneObject) => (hidden && o.id in hidden ? !hidden[o.id] : o.visible)
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      data-testid={play ? 'scene-play' : 'scene-edit'}
      style={{ touchAction: 'none' }}
    >
      <rect width={scene.width} height={scene.height} fill="#2a2a30" />
      {bg && (
        <image href={bg} width={scene.width} height={scene.height} preserveAspectRatio="none" />
      )}
      {scene.objects.map((o) =>
        visible(o) || !play ? (
          <g key={o.id} opacity={visible(o) ? 1 : 0.35}>
            <ObjectPicture obj={o} />
            {play && onObjectClick && o.events.length > 0 && (
              <rect
                x={o.x}
                y={o.y}
                width={o.w}
                height={o.h}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onClick={() => onObjectClick(o)}
              />
            )}
          </g>
        ) : null,
      )}
      {scene.areas.map((a) => (
        <g key={a.id}>
          <AreaGlow
            area={a}
            on={play ? glowOn(a.glow, hover === a.id, press === a.id, touch) : false}
          />
          {play && (
            <path
              d={pathData(a.paths)}
              fillRule="evenodd"
              fill="transparent"
              pointerEvents="all"
              data-testid={`area-${a.name}`}
              style={{ cursor: a.events.length ? 'pointer' : 'default' }}
              onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(a.id)}
              onPointerLeave={() => {
                setHover(null)
                setPress(null)
              }}
              onPointerDown={(e) => {
                setTouch(e.pointerType !== 'mouse')
                setPress(a.id)
              }}
              onPointerUp={() => setPress(null)}
              onPointerCancel={() => setPress(null)}
              onClick={() => onAreaClick?.(a)}
            />
          )}
        </g>
      ))}
      {overlay}
    </svg>
  )
}
