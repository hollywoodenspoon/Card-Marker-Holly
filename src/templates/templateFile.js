import { newId } from '@/core/model/ids';
import { flatten, walk } from '@/core/model/tree';
async function blobToBase64(b) {
    const bytes = new Uint8Array(await b.arrayBuffer());
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000)
        s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
}
function base64ToBlob(data, type) {
    const bin = atob(data);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++)
        bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type });
}
function usedFamilies(els) {
    const fams = new Set();
    for (const e of flatten(els)) {
        if (e.type !== 'text')
            continue;
        fams.add(e.baseStyle.fontFamily);
        for (const p of e.defaultText.paragraphs)
            for (const r of p.runs)
                if (r.style?.fontFamily)
                    fams.add(r.style.fontFamily);
    }
    return fams;
}
export async function exportTemplate(t, assets, fonts) {
    const assetIds = new Set();
    for (const e of flatten(t.elements)) {
        if (e.type === 'image')
            assetIds.add(e.assetId);
        if (e.type === 'imageField' && e.defaultAssetId)
            assetIds.add(e.defaultAssetId);
    }
    const fams = usedFamilies(t.elements);
    const { projectId: _p, thumbnail: _t, ...template } = t;
    return {
        format: 'card-maker-template',
        version: 1,
        template: structuredClone(template),
        assets: await Promise.all([...assetIds]
            .map((id) => assets[id])
            .filter(Boolean)
            .map(async ({ blob, projectId: _pid, ...meta }) => ({
            ...meta,
            data: await blobToBase64(blob),
        }))),
        fonts: await Promise.all(Object.values(fonts)
            .filter((f) => fams.has(f.family))
            .map(async ({ blob, projectId: _pid, ...meta }) => ({
            ...meta,
            data: await blobToBase64(blob),
        }))),
    };
}
/**
 * Turn a template file into new rows for `projectId`. Everything gets fresh
 * ids; fonts already in the project (same family, weight and style) are reused.
 */
export function importTemplate(file, projectId, existingFonts) {
    const f = file;
    if (f?.format !== 'card-maker-template' || f.version !== 1 || !f.template)
        throw new Error('This is not a Card Maker template file.');
    const assetMap = new Map();
    const assets = (f.assets ?? []).map(({ data, ...meta }) => {
        const id = newId();
        assetMap.set(meta.id, id);
        return { ...meta, id, projectId, blob: base64ToBlob(data, meta.mime) };
    });
    const fonts = (f.fonts ?? [])
        .filter((fo) => !existingFonts.some((e) => e.family === fo.family && e.weight === fo.weight && e.style === fo.style))
        .map(({ data, ...meta }) => ({
        ...meta,
        id: newId(),
        projectId,
        blob: base64ToBlob(data, 'font/ttf'),
    }));
    const elements = structuredClone(f.template.elements);
    walk(elements, (e) => {
        e.id = newId();
        if (e.type === 'image')
            e.assetId = assetMap.get(e.assetId) ?? e.assetId;
        if (e.type === 'imageField' && e.defaultAssetId)
            e.defaultAssetId = assetMap.get(e.defaultAssetId) ?? e.defaultAssetId;
    });
    const now = Date.now();
    return {
        template: {
            ...structuredClone(f.template),
            id: newId(),
            projectId,
            elements,
            guides: (f.template.guides ?? []).map((g) => ({ ...g, id: newId() })),
            createdAt: now,
            updatedAt: now,
        },
        assets,
        fonts,
    };
}
