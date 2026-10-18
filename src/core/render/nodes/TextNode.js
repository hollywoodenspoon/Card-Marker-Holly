import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Rect, Shape } from 'react-konva';
import { drawLayout, useTextLayout } from '../textDraw';
import { useStageCtx } from '../stageContext';
export function TextNode({ el, value }) {
    const ctx = useStageCtx();
    const layout = useTextLayout(el, value, ctx.renderVersion);
    return (_jsxs(Group, { children: [_jsx(Rect, { width: el.wMm, height: el.hMm, fill: "transparent" }), _jsx(Shape, { listening: false, sceneFunc: (c) => drawLayout(c._context, layout, el.paddingMm) }), layout.overflow && !ctx.static && (_jsx(Rect, { width: el.wMm, height: el.hMm, stroke: "#e5484d", strokeWidth: 1, dash: [3, 2], strokeScaleEnabled: false, listening: false }))] }));
}
