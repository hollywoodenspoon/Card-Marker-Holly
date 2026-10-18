import { jsx as _jsx } from "react/jsx-runtime";
import { Image as KImage, Rect } from 'react-konva';
import { FULL_CROP } from '../imageMath';
import { useStageCtx } from '../stageContext';
export function ImageNode({ el }) {
    const ctx = useStageCtx();
    const img = ctx.assets.getImage(el.assetId);
    const info = ctx.assets.getInfo(el.assetId);
    if (!img || !info)
        return _jsx(Rect, { width: el.wMm, height: el.hMm, fill: "#e4e4e8" });
    const c = el.crop ?? FULL_CROP;
    // Crop in decoded pixels (SVGs are decoded larger than their intrinsic size).
    const nw = img.naturalWidth || info.widthPx;
    const nh = img.naturalHeight || info.heightPx;
    return (_jsx(KImage, { image: img, width: el.wMm, height: el.hMm, crop: {
            x: c.x * nw,
            y: c.y * nh,
            width: c.w * nw,
            height: c.h * nh,
        } }));
}
