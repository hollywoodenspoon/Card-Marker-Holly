import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Line, Rect } from 'react-konva';
const BLEED_SHADE = 'rgba(120,120,128,0.55)';
/** Bleed shading, trim line, safe-area line. Drawn above content, never interactive. */
export function TrimOverlay({ w, h, bleed, safe, }) {
    const b = bleed;
    return (_jsxs(Group, { listening: false, children: [b > 0 && (_jsxs(_Fragment, { children: [_jsx(Rect, { x: -b, y: -b, width: w + 2 * b, height: b, fill: BLEED_SHADE }), _jsx(Rect, { x: -b, y: h, width: w + 2 * b, height: b, fill: BLEED_SHADE }), _jsx(Rect, { x: -b, y: 0, width: b, height: h, fill: BLEED_SHADE }), _jsx(Rect, { x: w, y: 0, width: b, height: h, fill: BLEED_SHADE }), _jsx(Rect, { x: -b, y: -b, width: w + 2 * b, height: h + 2 * b, stroke: "#e5484d", strokeWidth: 1, dash: [4, 3], strokeScaleEnabled: false })] })), _jsx(Rect, { width: w, height: h, stroke: "#111", strokeWidth: 1, strokeScaleEnabled: false }), safe > 0 && safe * 2 < Math.min(w, h) && (_jsx(Rect, { x: safe, y: safe, width: w - 2 * safe, height: h - 2 * safe, stroke: "#2f9e44", strokeWidth: 1, dash: [3, 3], strokeScaleEnabled: false }))] }));
}
/** Snap feedback lines in mm, spanning well beyond the card. */
export function SnapLines({ xs, ys, w, h }) {
    const pad = Math.max(w, h);
    return (_jsxs(Group, { listening: false, children: [xs.map((x) => (_jsx(Line, { points: [x, -pad, x, h + pad], stroke: "#ff2d87", strokeWidth: 1, strokeScaleEnabled: false }, `x${x}`))), ys.map((y) => (_jsx(Line, { points: [-pad, y, w + pad, y], stroke: "#ff2d87", strokeWidth: 1, strokeScaleEnabled: false }, `y${y}`)))] }));
}
