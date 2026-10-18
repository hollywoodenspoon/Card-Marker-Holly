import { useEditor } from '@/core/editor/editorStore';
import { addElement } from '@/core/editor/elementCommands';
import { activeTemplate } from '@/core/editor/selectors';
import { createImageField, createShape, createText } from '@/core/model/factories';
import { richTextFromPlain } from '@/core/text/richtext';
function cardSize() {
    const s = useEditor.getState();
    return activeTemplate(s)?.size ?? s.doc.project.defaultSize;
}
function centred(wMm, hMm) {
    const { widthMm, heightMm } = cardSize();
    return { xMm: (widthMm - wMm) / 2, yMm: (heightMm - hMm) / 2, wMm, hMm };
}
export function addText() {
    const { widthMm } = cardSize();
    const w = Math.min(50, widthMm - 10);
    return addElement(createText(centred(w, 8), { name: 'Text', defaultText: richTextFromPlain('Your text') }));
}
export function addShape(kind) {
    const box = kind === 'line' ? centred(30, 2) : centred(20, 20);
    const name = kind === 'rect' ? 'Rectangle' : kind === 'ellipse' ? 'Ellipse' : 'Line';
    return addElement(createShape(box, {
        name,
        kind,
        fill: kind === 'line' ? null : '#6d5dfc',
        stroke: kind === 'line' ? '#1a1a1a' : null,
    }));
}
export function addImageField() {
    const { widthMm, heightMm } = cardSize();
    const s = Math.min(widthMm, heightMm) * 0.5;
    return addElement(createImageField(centred(s, s), { name: 'Art' }));
}
