import { readImageFile, isSupportedImage } from '@/assets/imageAssets';
import { setView, updateLibrary, useEditor } from '@/core/editor/editorStore';
import { addElement, updateElements } from '@/core/editor/elementCommands';
import { activeTemplate, findSurfaceElement } from '@/core/editor/selectors';
import { createImage } from '@/core/model/factories';
import { centreCrop } from '@/core/render/imageMath';
import { setImageFieldValue } from '@/templates/fieldCommands';
export async function importImages(files) {
    const s = useEditor.getState();
    if (!s.doc)
        return [];
    const assets = [];
    for (const f of files.filter(isSupportedImage)) {
        try {
            assets.push(await readImageFile(f, s.doc.project.id));
        }
        catch (e) {
            console.warn('Could not read image', f.name, e);
        }
    }
    if (assets.length)
        updateLibrary((l) => {
            for (const a of assets)
                l.assets[a.id] = a;
        });
    return assets;
}
/**
 * Place an asset: into the selected image field (unless `newElement`), or as a
 * new image element.
 */
export function placeAsset(asset, at, newElement = false) {
    const s = useEditor.getState();
    const sel = s.view.selection.length === 1 ? findSurfaceElement(s, s.view.selection[0]) : undefined;
    if (sel?.type === 'imageField' && !newElement) {
        setImageFieldValue(sel.id, { assetId: asset.id, offsetXMm: 0, offsetYMm: 0, zoom: 1 });
        return sel.id;
    }
    const size = activeTemplate(s)?.size ?? s.doc.project.defaultSize;
    const maxW = size.widthMm * 0.6;
    const maxH = size.heightMm * 0.6;
    const ar = asset.widthPx / asset.heightPx;
    let w = maxW;
    let h = w / ar;
    if (h > maxH) {
        h = maxH;
        w = h * ar;
    }
    const x = at ? at.x - w / 2 : (size.widthMm - w) / 2;
    const y = at ? at.y - h / 2 : (size.heightMm - h) / 2;
    return addElement(createImage({ xMm: x, yMm: y, wMm: w, hMm: h }, asset.id, { name: asset.name }));
}
export async function importAndPlace(files, at, newElement = false) {
    const assets = await importImages(files);
    let last;
    for (const a of assets)
        last = placeAsset(a, at, newElement);
    if (last)
        setView({ selection: [last] });
}
/** Swap the picture of an image element, keeping its frame (crops to avoid distortion). */
export async function replaceImage(id, file) {
    const [asset] = await importImages([file]);
    if (!asset)
        return;
    const el = findSurfaceElement(useEditor.getState(), id);
    if (el?.type === 'imageField')
        return setImageFieldValue(id, { assetId: asset.id, offsetXMm: 0, offsetYMm: 0, zoom: 1 });
    updateElements([id], (e) => {
        if (e.type !== 'image')
            return;
        e.assetId = asset.id;
        e.crop = centreCrop(e.wMm, e.hMm, asset.widthPx, asset.heightPx);
    });
}
export function pickFiles(accept, multiple = true) {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = multiple;
        input.onchange = () => resolve([...(input.files ?? [])]);
        input.click();
    });
}
