import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Circle, Group, Text } from 'react-konva';
import { elementBounds } from '../model/tree';
import { LOW_DPI, nodeDpi } from './imageMath';
function collect(nodes, out = []) {
    for (const n of nodes) {
        if (n.children)
            collect(n.children, out);
        else
            out.push(n);
    }
    return out;
}
/** Warning badges on images that would print below ~300 DPI. Fixed screen size. */
export function DpiBadges({ nodes, assets, k, }) {
    const low = collect(nodes).filter((n) => {
        const d = nodeDpi(n, assets);
        return d !== undefined && d < LOW_DPI;
    });
    const r = 9 / k;
    return (_jsx(Group, { listening: false, children: low.map((n) => {
            const b = elementBounds(n.element);
            return (_jsxs(Group, { x: b.xMm + b.wMm - r * 1.4, y: b.yMm + r * 1.4, children: [_jsx(Circle, { radius: r, fill: "#f59f00", stroke: "#fff", strokeWidth: 1.5, strokeScaleEnabled: false }), _jsx(Text, { text: "!", fontSize: r * 1.4, fontStyle: "bold", fontFamily: "Inter", fill: "#fff", width: r * 2, x: -r, y: -r * 0.68, align: "center" })] }, n.element.id));
        }) }));
}
