import type Konva from 'konva'
import { Group } from 'react-konva'
import type { RenderNode } from '../renderTypes'
import { useStageCtx } from '../stageContext'
import { ImageFieldNode } from './ImageFieldNode'
import { IconRowNode } from './IconRowNode'
import { ImageNode } from './ImageNode'
import { ShapeNode } from './ShapeNode'
import { TextNode } from './TextNode'

/**
 * One element. Leaves are a Group at (x, y, rotation) with a w×h content box;
 * flips are applied to an inner group so the Transformer only ever sees scale 1.
 */
export function ElementNode({ node, inGroup }: { node: RenderNode; inGroup?: boolean }) {
  const ctx = useStageCtx()
  const el = node.element
  const interactive = !ctx.static && !inGroup
  const selectable = interactive && ctx.isSelectable(el.id)
  const editable = interactive && ctx.isEditable(el.id)
  const opacity = el.opacity * (node.dimmed ? 0.35 : 1)
  const events = selectable
    ? {
        onPointerDown: (e: Konva.KonvaEventObject<PointerEvent>) =>
          ctx.onElementPointerDown(e, el.id),
        onDblClick: () => ctx.onElementDblClick(el.id),
        onDblTap: () => ctx.onElementDblClick(el.id),
        onDragStart: () => ctx.onDragStart(el.id),
        onDragEnd: () => ctx.onDragEnd(el.id),
      }
    : {}

  if (el.type === 'group') {
    return (
      <Group
        id={el.id}
        name="element group-el"
        opacity={opacity}
        draggable={editable}
        dragBoundFunc={editable ? ctx.dragBoundFunc(el.id) : undefined}
        listening={ctx.static ? false : inGroup ? true : selectable}
        {...events}
      >
        {node.children?.map((c) => (
          <ElementNode key={c.element.id} node={c} inGroup />
        ))}
      </Group>
    )
  }

  return (
    <Group
      id={el.id}
      name="element"
      x={el.xMm}
      y={el.yMm}
      width={el.wMm}
      height={el.hMm}
      rotation={el.rotation}
      opacity={opacity}
      visible={ctx.hiddenId !== el.id}
      draggable={editable}
      dragBoundFunc={editable ? ctx.dragBoundFunc(el.id) : undefined}
      listening={ctx.static ? false : inGroup ? true : selectable}
      {...events}
    >
      <Group
        x={el.flipX ? el.wMm : 0}
        y={el.flipY ? el.hMm : 0}
        scaleX={el.flipX ? -1 : 1}
        scaleY={el.flipY ? -1 : 1}
      >
        {el.type === 'shape' && <ShapeNode el={el} />}
        {el.type === 'text' && node.text && <TextNode el={el} value={node.text} />}
        {el.type === 'imageField' && node.image && <ImageFieldNode el={el} value={node.image} />}
        {el.type === 'image' && <ImageNode el={el} />}
        {el.type === 'iconRow' && <IconRowNode el={el} count={node.count ?? el.defaultCount} />}
      </Group>
    </Group>
  )
}
