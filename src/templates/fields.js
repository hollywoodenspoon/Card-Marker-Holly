import { flatten } from '@/core/model/tree';
export function isField(el) {
    return el.type === 'text' || el.type === 'imageField';
}
export function templateFields(t) {
    return flatten(t.elements).filter(isField);
}
/** Other fields in the template using the same name (they will show the same value). */
export function sharedFieldNames(t, el) {
    return templateFields(t).filter((f) => f.id !== el.id && f.fieldName === el.fieldName);
}
/**
 * When a field is renamed in a template, move card values to the new name
 * for cards using that template — unless the card already has a value there.
 */
export function migrateFieldRename(cards, templateId, from, to) {
    if (from === to)
        return;
    for (const c of cards) {
        if (c.frontTemplateId !== templateId && c.backTemplateId !== templateId)
            continue;
        if (c.fields[from] && !c.fields[to]) {
            c.fields[to] = c.fields[from];
            delete c.fields[from];
        }
    }
}
export function cardsUsingTemplate(cards, templateId) {
    return cards.filter((c) => c.frontTemplateId === templateId || c.backTemplateId === templateId);
}
