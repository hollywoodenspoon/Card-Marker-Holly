import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Group, Image as KImage, Rect, Text } from 'react-konva';
import { framePlacement } from '../imageMath';
import { useStageCtx } from '../stageContext';
function roundedClip(w, h, r) {
    return (c) => {
        const rr = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(rr, 0);
        c.arcTo(w, 0, w, h, rr);
        c.arcTo(w, h, 0, h, rr);
        c.arcTo(0, h, 0, 0, rr);
        c.arcTo(0, 0, w, 0, rr);
        c.closePath();
    };
}
export function ImageFieldNode({ el, value }) {
    const ctx = useStageCtx();
    const img = value.assetId ? ctx.assets.getImage(value.assetId) : undefined;
    const info = value.assetId ? ctx.assets.getInfo(value.assetId) : undefined;
    if (!img || !info) {
        return (_jsxs(Group, { clipFunc: roundedClip(el.wMm, el.hMm, el.radiusMm), children: [_jsx(Rect, { width: el.wMm, height: el.hMm, fill: el.placeholderColor }), !ctx.static && (_jsx(Text, { width: el.wMm, height: el.hMm, text: value.assetId ? '' : el.name, align: "center", verticalAlign: "middle", fontFamily: "Inter", fontSize: Math.max(1.5, Math.min(4, el.hMm / 5, el.wMm / 6)), fill: "#7a7a85" }))] }));
    }
    const p = framePlacement(el.wMm, el.hMm, info.widthPx, info.heightPx, value);
    return (_jsxs(Group, { clipFunc: roundedClip(el.wMm, el.hMm, el.radiusMm), children: [_jsx(Rect, { width: el.wMm, height: el.hMm, fill: el.placeholderColor, opacity: value.fit === 'fit' ? 1 : 0 }), _jsx(KImage, { image: img, x: p.x, y: p.y, width: p.w, height: p.h })] }));
}
