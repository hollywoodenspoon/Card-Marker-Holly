/** Is a template element visible on this card? */
export function isVisibleOnCard(el, card) {
    if (el.toggleLocked || !card)
        return el.defaultVisible;
    return card.overrides[el.id]?.visible ?? el.defaultVisible;
}
export function textValueFor(el, card) {
    const v = card?.fields[el.fieldName];
    return v?.kind === 'text' ? v : { kind: 'text', text: el.defaultText };
}
export function imageValueFor(el, card) {
    const v = card?.fields[el.fieldName];
    if (v?.kind === 'image')
        return { ...v, fit: v.fit ?? el.fit };
    return {
        kind: 'image',
        assetId: el.defaultAssetId,
        fit: el.fit,
        offsetXMm: 0,
        offsetYMm: 0,
        zoom: 1,
    };
}
function resolveElements(els, source, card, mode) {
    const out = [];
    for (const el of els) {
        // Card-local elements only use their own default visibility.
        const visible = source === 'template' && mode === 'card' ? isVisibleOnCard(el, card) : el.defaultVisible;
        if (!visible && mode === 'card')
            continue;
        const node = { element: el, source, dimmed: !visible };
        if (el.type === 'text')
            node.text = textValueFor(el, card);
        else if (el.type === 'imageField')
            node.image = imageValueFor(el, card);
        else if (el.type === 'group')
            node.children = resolveElements(el.children, source, card, mode);
        out.push(node);
    }
    return out;
}
/**
 * Turn a template + a card into the tree of things to draw.
 * Geometry always comes from the template, so hiding a part never moves the others.
 *
 * - card mode: per-card visibility overrides apply; hidden parts are dropped;
 *   the card's own layer is drawn on top.
 * - template mode: default visibility; hidden parts are kept but dimmed;
 *   the card (if any) only supplies preview values for fields.
 */
export function resolveSide(template, card, side, mode) {
    const nodes = template ? resolveElements(template.elements, 'template', card, mode) : [];
    if (mode === 'card' && card)
        nodes.push(...resolveElements(card.local[side], 'card', card, mode));
    return nodes;
}
