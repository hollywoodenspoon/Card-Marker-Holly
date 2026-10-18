import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo, useMemo } from 'react';
import { Group, Layer, Rect, Stage } from 'react-konva';
import { ElementNode } from './nodes/ElementNode';
import { StageCtx } from './stageContext';
const noop = () => { };
/** Non-interactive rendering of a card at a given pixel width (thumbnails, previews). */
export const StaticCard = memo(function StaticCard({ nodes, widthMm, heightMm, widthPx, assets, renderVersion, }) {
    const k = widthPx / widthMm;
    const ctx = useMemo(() => ({
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
    }), [assets, renderVersion]);
    return (_jsx(Stage, { width: widthPx, height: Math.round(heightMm * k), listening: false, children: _jsx(Layer, { listening: false, children: _jsxs(Group, { scaleX: k, scaleY: k, clipX: 0, clipY: 0, clipWidth: widthMm, clipHeight: heightMm, children: [_jsx(Rect, { width: widthMm, height: heightMm, fill: "#fff" }), _jsx(StageCtx.Provider, { value: ctx, children: nodes.map((n) => (_jsx(ElementNode, { node: n }, n.element.id))) })] }) }) }));
});
