import { newId } from '@/core/model/ids';
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml,.svg,.png,.jpg,.jpeg,.webp';
const ok = /^image\/(png|jpeg|webp|svg\+xml)$/;
export function isSupportedImage(file) {
    return ok.test(file.type) || /\.(png|jpe?g|webp|svg)$/i.test(file.name);
}
const isSvg = (file) => file.type === 'image/svg+xml' || /\.svg$/i.test(file.name ?? '');
/** Read an uploaded image into an Asset (original blob + pixel size). */
export async function readImageFile(file, projectId) {
    const vector = isSvg(file);
    const blob = vector && file.type !== 'image/svg+xml' ? new Blob([file], { type: 'image/svg+xml' }) : file;
    const { width, height } = vector ? svgSize(await file.text()) : await rasterSize(file);
    return {
        id: newId(),
        projectId,
        name: file.name.replace(/\.[^.]+$/, '') || 'Image',
        mime: blob.type || file.type,
        blob,
        widthPx: width,
        heightPx: height,
        isVector: vector,
        tags: [],
        createdAt: Date.now(),
    };
}
async function rasterSize(blob) {
    if (typeof createImageBitmap === 'function') {
        const bmp = await createImageBitmap(blob);
        const r = { width: bmp.width, height: bmp.height };
        bmp.close();
        return r;
    }
    const url = URL.createObjectURL(blob);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        return { width: img.naturalWidth, height: img.naturalHeight };
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
const UNIT_PX = {
    px: 1,
    pt: 96 / 72,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    in: 96,
    '': 1,
};
function parseLength(v) {
    if (!v)
        return null;
    const m = /^\s*([\d.]+)\s*(px|pt|mm|cm|in)?\s*$/.exec(v);
    if (!m)
        return null;
    return parseFloat(m[1]) * UNIT_PX[m[2] ?? ''];
}
/** Intrinsic size of an SVG from width/height or its viewBox. */
export function svgSize(text) {
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    const vb = svg
        .getAttribute('viewBox')
        ?.split(/[\s,]+/)
        .map(Number);
    const vbW = vb && vb.length === 4 ? vb[2] : null;
    const vbH = vb && vb.length === 4 ? vb[3] : null;
    let w = parseLength(svg.getAttribute('width'));
    let h = parseLength(svg.getAttribute('height'));
    if (w && !h && vbW && vbH)
        h = (w * vbH) / vbW;
    if (h && !w && vbW && vbH)
        w = (h * vbW) / vbH;
    return { width: Math.round(w ?? vbW ?? 512), height: Math.round(h ?? vbH ?? 512) };
}
/**
 * Display copy of an SVG with explicit width/height so <img> decodes it at a
 * usable size. The original blob is left untouched for vector export.
 */
export async function svgDisplayBlob(blob, width, height) {
    const text = await blob.text();
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
    const svg = doc.documentElement;
    // Render big enough to stay sharp when zoomed in.
    const scale = Math.max(1, 2048 / Math.max(width, height));
    svg.setAttribute('width', String(Math.round(width * scale)));
    svg.setAttribute('height', String(Math.round(height * scale)));
    if (!svg.getAttribute('viewBox'))
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    return new Blob([new XMLSerializer().serializeToString(doc)], { type: 'image/svg+xml' });
}
