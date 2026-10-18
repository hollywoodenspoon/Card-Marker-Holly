import { MM_PER_INCH } from '../units/units';
export const FULL_CROP = { x: 0, y: 0, w: 1, h: 1 };
/** mm per source pixel for an image inside a frame (image fields). */
export function frameScale(frameW, frameH, imgW, imgH, fit, zoom) {
    const sx = frameW / imgW;
    const sy = frameH / imgH;
    return (fit === 'fill' ? Math.max(sx, sy) : Math.min(sx, sy)) * zoom;
}
/** Placement (top-left and size, mm, relative to the frame) of an image in an image field. */
export function framePlacement(frameW, frameH, imgW, imgH, v) {
    const s = frameScale(frameW, frameH, imgW, imgH, v.fit ?? 'fill', v.zoom || 1);
    const w = imgW * s;
    const h = imgH * s;
    return {
        x: (frameW - w) / 2 + v.offsetXMm,
        y: (frameH - h) / 2 + v.offsetYMm,
        w,
        h,
        mmPerPx: s,
    };
}
/** Effective print DPI of a cropped image drawn in a w×h mm box. */
export function croppedImageDpi(wMm, hMm, imgW, imgH, crop = FULL_CROP) {
    const dx = (crop.w * imgW) / (wMm / MM_PER_INCH);
    const dy = (crop.h * imgH) / (hMm / MM_PER_INCH);
    return Math.min(dx, dy);
}
export const dpiFromMmPerPx = (mmPerPx) => MM_PER_INCH / mmPerPx;
/** Crop rect that fills a box of the given aspect from the centre of the image. */
export function centreCrop(boxW, boxH, imgW, imgH) {
    const boxAR = boxW / boxH;
    const imgAR = imgW / imgH;
    if (imgAR > boxAR) {
        const w = boxAR / imgAR;
        return { x: (1 - w) / 2, y: 0, w, h: 1 };
    }
    const h = imgAR / boxAR;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
}
export const LOW_DPI = 300;
/** Effective DPI for an image or image-field node (undefined for vectors or no image). */
export function nodeDpi(n, assets) {
    const el = n.element;
    if (el.type === 'image') {
        const info = assets.getInfo(el.assetId);
        if (!info || info.isVector)
            return undefined;
        return croppedImageDpi(el.wMm, el.hMm, info.widthPx, info.heightPx, el.crop);
    }
    if (el.type === 'imageField' && n.image?.assetId) {
        const info = assets.getInfo(n.image.assetId);
        if (!info || info.isVector)
            return undefined;
        return dpiFromMmPerPx(framePlacement(el.wMm, el.hMm, info.widthPx, info.heightPx, n.image).mmPerPx);
    }
    return undefined;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
/**
 * New crop for an image element whose frame was resized in crop mode:
 * the picture keeps its scale, the frame reveals more or less of it.
 */
export function cropAfterFrameResize(el, next, info) {
    const c = el.crop ?? FULL_CROP;
    const sx = el.wMm / (c.w * info.widthPx);
    const sy = el.hMm / (c.h * info.heightPx);
    // top-left movement in the element's own (rotated) axes
    const r = (-el.rotation * Math.PI) / 180;
    const dxw = next.x - el.xMm;
    const dyw = next.y - el.yMm;
    const dx = dxw * Math.cos(r) - dyw * Math.sin(r);
    const dy = dxw * Math.sin(r) + dyw * Math.cos(r);
    const x = clamp(c.x + dx / (info.widthPx * sx), 0, 1);
    const y = clamp(c.y + dy / (info.heightPx * sy), 0, 1);
    const w = clamp(next.w / (info.widthPx * sx), 0.01, 1 - x);
    const h = clamp(next.h / (info.heightPx * sy), 0.01, 1 - y);
    return { crop: { x, y, w, h }, wMm: w * info.widthPx * sx, hMm: h * info.heightPx * sy };
}
