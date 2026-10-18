import { findElement } from '../model/tree';
export function currentCard(s) {
    const id = s.view.cardId;
    return id && s.doc ? s.doc.cards[id] : undefined;
}
export function sortedCards(s) {
    return s.doc ? Object.values(s.doc.cards).sort((a, b) => a.order - b.order) : [];
}
export function templatesOfSide(s, side) {
    return s.doc
        ? Object.values(s.doc.templates)
            .filter((t) => t.side === side)
            .sort((a, b) => a.createdAt - b.createdAt)
        : [];
}
/** The template shown on the canvas right now. */
export function activeTemplate(s) {
    if (!s.doc)
        return undefined;
    if (s.view.mode === 'template')
        return s.view.templateId ? s.doc.templates[s.view.templateId] : undefined;
    const card = currentCard(s);
    const id = card ? (s.view.side === 'front' ? card.frontTemplateId : card.backTemplateId) : null;
    return id ? s.doc.templates[id] : undefined;
}
/** Card-only elements on the current side (empty in template mode). */
export function localElements(s) {
    if (s.view.mode === 'template')
        return [];
    return currentCard(s)?.local[s.view.side] ?? [];
}
/** Everything that can be selected on the canvas, bottom to top. */
export function surfaceElements(s) {
    return [...(activeTemplate(s)?.elements ?? []), ...localElements(s)];
}
export function ownerOf(s, id) {
    if (findElement(localElements(s), id))
        return 'local';
    if (findElement(activeTemplate(s)?.elements ?? [], id))
        return 'template';
    return undefined;
}
export function findSurfaceElement(s, id) {
    return findElement(localElements(s), id) ?? findElement(activeTemplate(s)?.elements ?? [], id);
}
/** Can the element's layout (geometry, style) be edited in the current mode? */
export function isLayoutEditable(s, id) {
    const owner = ownerOf(s, id);
    return owner === 'local' || (owner === 'template' && s.view.mode === 'template');
}
export function selectedElements(s) {
    return s.view.selection.map((id) => findSurfaceElement(s, id)).filter((e) => !!e);
}
