import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Ellipse, Line, Rect } from 'react-konva';
export function ShapeNode({ el }) {
    const common = {
        fill: el.fill ?? undefined,
        stroke: el.stroke ?? undefined,
        strokeWidth: el.stroke ? el.strokeMm : 0,
    };
    if (el.kind === 'ellipse')
        return (_jsx(Ellipse, { x: el.wMm / 2, y: el.hMm / 2, radiusX: el.wMm / 2, radiusY: el.hMm / 2, ...common }));
    if (el.kind === 'line')
        return (_jsxs(_Fragment, { children: [_jsx(Rect, { width: el.wMm, height: Math.max(el.hMm, 0.01), fill: "transparent" }), _jsx(Line, { points: [0, el.hMm / 2, el.wMm, el.hMm / 2], stroke: el.stroke ?? el.fill ?? '#000', strokeWidth: el.strokeMm, hitStrokeWidth: Math.max(el.strokeMm, 2), lineCap: "round" })] }));
    return (_jsx(Rect, { width: el.wMm, height: el.hMm, cornerRadius: Math.min(el.radiusMm, el.wMm / 2, el.hMm / 2), ...common }));
}
