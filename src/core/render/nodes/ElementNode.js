import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group } from 'react-konva';
import { useStageCtx } from '../stageContext';
import { ImageFieldNode } from './ImageFieldNode';
import { ImageNode } from './ImageNode';
import { ShapeNode } from './ShapeNode';
import { TextNode } from './TextNode';
/**
 * One element. Leaves are a Group at (x, y, rotation) with a w×h content box;
 * flips are applied to an inner group so the Transformer only ever sees scale 1.
 */
export function ElementNode({ node, inGroup }) {
    const ctx = useStageCtx();
    const el = node.element;
    const interactive = !ctx.static && !inGroup;
    const selectable = interactive && ctx.isSelectable(el.id);
    const editable = interactive && ctx.isEditable(el.id);
    const opacity = el.opacity * (node.dimmed ? 0.35 : 1);
    const events = selectable
        ? {
            onPointerDown: (e) => ctx.onElementPointerDown(e, el.id),
            onDblClick: () => ctx.onElementDblClick(el.id),
            onDblTap: () => ctx.onElementDblClick(el.id),
            onDragStart: () => ctx.onDragStart(el.id),
            onDragEnd: () => ctx.onDragEnd(el.id),
        }
        : {};
    if (el.type === 'group') {
        return (_jsx(Group, { id: el.id, name: "element group-el", opacity: opacity, draggable: editable, dragBoundFunc: editable ? ctx.dragBoundFunc(el.id) : undefined, listening: ctx.static ? false : inGroup ? true : selectable, ...events, children: node.children?.map((c) => (_jsx(ElementNode, { node: c, inGroup: true }, c.element.id))) }));
    }
    return (_jsx(Group, { id: el.id, name: "element", x: el.xMm, y: el.yMm, width: el.wMm, height: el.hMm, rotation: el.rotation, opacity: opacity, visible: ctx.hiddenId !== el.id, draggable: editable, dragBoundFunc: editable ? ctx.dragBoundFunc(el.id) : undefined, listening: ctx.static ? false : inGroup ? true : selectable, ...events, children: _jsxs(Group, { x: el.flipX ? el.wMm : 0, y: el.flipY ? el.hMm : 0, scaleX: el.flipX ? -1 : 1, scaleY: el.flipY ? -1 : 1, children: [el.type === 'shape' && _jsx(ShapeNode, { el: el }), el.type === 'text' && node.text && _jsx(TextNode, { el: el, value: node.text }), el.type === 'imageField' && node.image && _jsx(ImageFieldNode, { el: el, value: node.image }), el.type === 'image' && _jsx(ImageNode, { el: el })] }) }));
}
