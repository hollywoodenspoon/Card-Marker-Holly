import { memo, useMemo } from 'react'
import { Group, Layer, Rect, Stage } from 'react-konva'
import { ElementNode } from './nodes/ElementNode'
import type { AssetResolver, RenderNode } from './renderTypes'
import { StageCtx, type StageInteraction } from './stageContext'

const noop = () => {}

/** Non-interactive rendering of a card at a given pixel width (thumbnails, previews). */
export const StaticCard = memo(function StaticCard({
  nodes,
  widthMm,
  heightMm,
  widthPx,
  assets,
  renderVersion,
}: {
  nodes: RenderNode[]
  widthMm: number
  heightMm: number
  widthPx: number
  assets: AssetResolver
  renderVersion: number
}) {
  const k = widthPx / widthMm
  const ctx: StageInteraction = useMemo(
    () => ({
      static: true,
      assets,
      renderVersion,
      hiddenId: null,
      isEditable: () => false,
      isSelectable: () => false,
      onElementPointerDown: noop,
      onElementDblClick: noop,
      dragBoundFunc: () => undefined,
      onDragStart: noop,
      onDragEnd: noop,
    }),
    [assets, renderVersion],
  )
  return (
    <Stage width={widthPx} height={Math.round(heightMm * k)} listening={false}>
      <Layer listening={false}>
        <Group scaleX={k} scaleY={k} clipX={0} clipY={0} clipWidth={widthMm} clipHeight={heightMm}>
          <Rect width={widthMm} height={heightMm} fill="#fff" />
          <StageCtx.Provider value={ctx}>
            {nodes.map((n) => (
              <ElementNode key={n.element.id} node={n} />
            ))}
          </StageCtx.Provider>
        </Group>
      </Layer>
    </Stage>
  )
})
