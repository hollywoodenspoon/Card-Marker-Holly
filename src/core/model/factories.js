import { DEFAULT_TEXT_STYLE, richTextFromPlain } from '../text/richtext';
import { DEFAULT_PRESET_ID, presetSize } from '../units/presets';
import { newId } from './ids';
const now = () => Date.now();
function base(name, box) {
    return {
        id: newId(),
        name,
        ...box,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        defaultVisible: true,
        toggleLocked: false,
        editLocked: false,
    };
}
export function createText(box, opts = {}) {
    const name = opts.name ?? 'Text';
    return {
        ...base(name, box),
        type: 'text',
        fieldName: opts.fieldName ?? name,
        defaultText: richTextFromPlain('Text'),
        baseStyle: { ...DEFAULT_TEXT_STYLE },
        align: 'left',
        lineHeight: 1.2,
        vAlign: 'top',
        paddingMm: 0,
        autoShrink: { enabled: true, minPt: 5 },
        ...opts,
    };
}
export function createImageField(box, opts = {}) {
    const name = opts.name ?? 'Art';
    return {
        ...base(name, box),
        type: 'imageField',
        fieldName: opts.fieldName ?? name,
        fit: 'fill',
        placeholderColor: '#d9d9de',
        radiusMm: 0,
        ...opts,
    };
}
export function createShape(box, opts = {}) {
    return {
        ...base(opts.name ?? 'Shape', box),
        type: 'shape',
        kind: 'rect',
        fill: '#6d5dfc',
        stroke: null,
        strokeMm: 0.5,
        radiusMm: 0,
        ...opts,
    };
}
export function createImage(box, assetId, opts = {}) {
    return { ...base(opts.name ?? 'Image', box), type: 'image', assetId, ...opts };
}
export function createGroup(children, name = 'Group') {
    return { ...base(name, { xMm: 0, yMm: 0, wMm: 0, hMm: 0 }), type: 'group', children };
}
export function createTemplate(projectId, side, size, name, elements = []) {
    const t = now();
    return {
        id: newId(),
        projectId,
        name,
        side,
        size,
        elements,
        guides: [],
        createdAt: t,
        updatedAt: t,
    };
}
export function createCard(projectId, order, frontTemplateId, backTemplateId, name = 'Card') {
    const t = now();
    return {
        id: newId(),
        projectId,
        name,
        order,
        frontTemplateId,
        backTemplateId,
        fields: {},
        overrides: {},
        local: { front: [], back: [] },
        createdAt: t,
        updatedAt: t,
    };
}
/** A starter front layout so a new user has something to fill in right away. */
export function starterFrontElements(size, bleedMm) {
    const { widthMm: w, heightMm: h } = size;
    const m = 4;
    const landscape = w > h;
    const art = landscape
        ? { xMm: m, yMm: m, wMm: h - 2 * m, hMm: h - 2 * m }
        : { xMm: m, yMm: m + 9, wMm: w - 2 * m, hMm: h * 0.45 };
    const textX = landscape ? art.xMm + art.wMm + 3 : m;
    const textW = landscape ? w - textX - m : w - 2 * m;
    const titleY = landscape ? m : m;
    const bodyY = landscape ? m + 9 : art.yMm + art.hMm + 3;
    return [
        createShape({ xMm: -bleedMm, yMm: -bleedMm, wMm: w + 2 * bleedMm, hMm: h + 2 * bleedMm }, { name: 'Background', fill: '#f4efe6', toggleLocked: true }),
        createImageField(art, { name: 'Art', radiusMm: 1.5 }),
        createText({ xMm: textX, yMm: titleY, wMm: textW, hMm: 7 }, {
            name: 'Title',
            defaultText: richTextFromPlain('Card name'),
            baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 12, bold: true },
            vAlign: 'middle',
            toggleLocked: true,
        }),
        createText({ xMm: textX, yMm: bodyY, wMm: textW, hMm: h - bodyY - m }, {
            name: 'Rules',
            defaultText: richTextFromPlain('Describe what this card does.'),
            baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 8 },
        }),
    ];
}
export function starterBackElements(size, bleedMm) {
    const { widthMm: w, heightMm: h } = size;
    return [
        createShape({ xMm: -bleedMm, yMm: -bleedMm, wMm: w + 2 * bleedMm, hMm: h + 2 * bleedMm }, { name: 'Background', fill: '#2d2a4a', toggleLocked: true }),
        createShape({ xMm: 4, yMm: 4, wMm: w - 8, hMm: h - 8 }, { name: 'Border', fill: null, stroke: '#c9b88a', strokeMm: 0.8, radiusMm: 2 }),
        createText({ xMm: 6, yMm: h / 2 - 6, wMm: w - 12, hMm: 12 }, {
            name: 'Back title',
            defaultText: richTextFromPlain('Card Game'),
            baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 16, bold: true, color: '#c9b88a' },
            align: 'center',
            vAlign: 'middle',
        }),
    ];
}
export function createProject(name = 'My card game', presetId = DEFAULT_PRESET_ID) {
    const t = now();
    const size = presetSize(presetId);
    const project = {
        id: newId(),
        name,
        createdAt: t,
        updatedAt: t,
        defaultSize: size,
        bleedMm: 3,
        safeMm: 3,
        print: { paper: 'A4', marginMm: 5 },
    };
    const front = createTemplate(project.id, 'front', size, 'Basic front', starterFrontElements(size, 3));
    const back = createTemplate(project.id, 'back', size, 'Basic back', starterBackElements(size, 3));
    const card = createCard(project.id, 1, front.id, back.id, 'Card 1');
    return { project, templates: [front, back], cards: [card] };
}
