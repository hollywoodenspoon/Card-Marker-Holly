import { createGroup } from '../model/factories';
import { newId } from '../model/ids';
import { cloneWithNewIds, elementBounds, findElement, flatten, removeElements, siblingsOf, translateElement, uniqueName, unionBounds, } from '../model/tree';
import { alignDeltas, distributeDeltas } from '../tools/align';
import { commit, setView, useEditor, } from './editorStore';
import { activeTemplate, isLayoutEditable, selectedElements, surfaceElements } from './selectors';
/** Element lists editable in the current mode: template elements (template mode) or the card layer. */
function editableLists(d, v) {
    if (v.mode === 'template') {
        const t = v.templateId ? d.templates[v.templateId] : undefined;
        return t ? [t.elements] : [];
    }
    const c = v.cardId ? d.cards[v.cardId] : undefined;
    return c ? [c.local[v.side]] : [];
}
/** Find an element anywhere on the canvas (template or card layer), as a draft. */
function locateDraft(d, v, id) {
    for (const list of editableLists(d, v)) {
        const f = findElement(list, id);
        if (f)
            return f;
    }
    return undefined;
}
/** The list new elements go into. */
function targetList(d, v) {
    return editableLists(d, v)[0];
}
function stamp(d, v) {
    const t = Date.now();
    if (v.mode === 'template' && v.templateId && d.templates[v.templateId])
        d.templates[v.templateId].updatedAt = t;
    if (v.mode === 'card' && v.cardId && d.cards[v.cardId])
        d.cards[v.cardId].updatedAt = t;
}
const view = () => useEditor.getState().view;
export function addElement(el) {
    const s = useEditor.getState();
    const names = flatten(surfaceElements(s)).map((e) => e.name);
    const named = { ...el, name: uniqueName(el.name, names) };
    if ((named.type === 'text' || named.type === 'imageField') && named.fieldName === el.name)
        named.fieldName = named.name;
    commit((d) => {
        const list = targetList(d, s.view);
        if (!list)
            return;
        list.push(named);
        stamp(d, s.view);
    });
    setView({ selection: [named.id] });
    return named.id;
}
/** Update elements by id (only those whose layout is editable in this mode). */
export function updateElements(ids, fn, coalesce, opts = {}) {
    const s = useEditor.getState();
    const editable = opts.contentOnly ? ids : ids.filter((id) => isLayoutEditable(s, id));
    if (!editable.length)
        return;
    commit((d) => {
        for (const id of editable) {
            const el = locateDraft(d, s.view, id);
            if (el)
                fn(el);
        }
        stamp(d, s.view);
    }, coalesce);
}
export function updateElement(id, fn, coalesce) {
    updateElements([id], fn, coalesce);
}
function editableSelection(s) {
    return s.view.selection.filter((id) => isLayoutEditable(s, id));
}
export function deleteSelection() {
    const s = useEditor.getState();
    const ids = new Set(editableSelection(s));
    if (!ids.size)
        return;
    commit((d) => {
        for (const list of editableLists(d, s.view))
            removeElements(list, ids);
        stamp(d, s.view);
    });
    setView({ selection: [] });
}
export function duplicateSelection() {
    const s = useEditor.getState();
    const ids = editableSelection(s);
    if (!ids.length)
        return;
    const newIds = [];
    const names = flatten(surfaceElements(s)).map((e) => e.name);
    commit((d) => {
        for (const id of ids) {
            for (const list of editableLists(d, s.view)) {
                const sibs = siblingsOf(list, id);
                if (!sibs)
                    continue;
                const i = sibs.findIndex((e) => e.id === id);
                const copy = cloneWithNewIds(JSON.parse(JSON.stringify(sibs[i])));
                copy.name = uniqueName(copy.name, names);
                names.push(copy.name);
                translateElement(copy, 2, 2);
                sibs.splice(i + 1, 0, copy);
                newIds.push(copy.id);
            }
        }
        stamp(d, s.view);
    });
    setView({ selection: newIds });
}
export function nudgeSelection(dx, dy) {
    const s = useEditor.getState();
    updateElements(editableSelection(s), (el) => translateElement(el, dx, dy), 'nudge');
}
export function reorderElement(id, dir) {
    const s = useEditor.getState();
    if (!isLayoutEditable(s, id))
        return;
    commit((d) => {
        for (const list of editableLists(d, s.view)) {
            const sibs = siblingsOf(list, id);
            if (!sibs)
                continue;
            const i = sibs.findIndex((e) => e.id === id);
            const [el] = sibs.splice(i, 1);
            const j = dir === 'forward'
                ? Math.min(sibs.length, i + 1)
                : dir === 'backward'
                    ? Math.max(0, i - 1)
                    : dir === 'front'
                        ? sibs.length
                        : 0;
            sibs.splice(j, 0, el);
        }
        stamp(d, s.view);
    });
}
/** Move an element to `index` (bottom = 0) within its sibling list. */
export function moveElementTo(id, index) {
    const s = useEditor.getState();
    if (!isLayoutEditable(s, id))
        return;
    commit((d) => {
        for (const list of editableLists(d, s.view)) {
            const sibs = siblingsOf(list, id);
            if (!sibs)
                continue;
            const i = sibs.findIndex((e) => e.id === id);
            const [el] = sibs.splice(i, 1);
            sibs.splice(Math.max(0, Math.min(sibs.length, index)), 0, el);
        }
        stamp(d, s.view);
    });
}
export function groupSelection() {
    const s = useEditor.getState();
    const ids = editableSelection(s);
    if (ids.length < 2)
        return;
    const groupId = newId();
    const names = flatten(surfaceElements(s)).map((e) => e.name);
    commit((d) => {
        for (const list of editableLists(d, s.view)) {
            const sibs = siblingsOf(list, ids[0]);
            if (!sibs || !ids.every((id) => sibs.some((e) => e.id === id)))
                continue;
            const picked = sibs.filter((e) => ids.includes(e.id));
            const top = Math.max(...picked.map((e) => sibs.indexOf(e)));
            const group = createGroup(JSON.parse(JSON.stringify(picked)), uniqueName('Group', names));
            group.id = groupId;
            sibs.splice(top + 1, 0, group);
            for (let i = sibs.length - 1; i >= 0; i--)
                if (ids.includes(sibs[i].id))
                    sibs.splice(i, 1);
        }
        stamp(d, s.view);
    });
    setView({ selection: [groupId] });
}
export function ungroupSelection() {
    const s = useEditor.getState();
    const groups = selectedElements(s).filter((e) => e.type === 'group' && isLayoutEditable(s, e.id));
    if (!groups.length)
        return;
    const childIds = [];
    commit((d) => {
        for (const g of groups) {
            for (const list of editableLists(d, s.view)) {
                const sibs = siblingsOf(list, g.id);
                if (!sibs)
                    continue;
                const i = sibs.findIndex((e) => e.id === g.id);
                const group = sibs[i];
                if (group.type !== 'group')
                    continue;
                childIds.push(...group.children.map((c) => c.id));
                sibs.splice(i, 1, ...group.children);
            }
        }
        stamp(d, s.view);
    });
    setView({ selection: childIds });
}
function cardBounds(s) {
    const t = activeTemplate(s);
    const size = t?.size ?? s.doc.project.defaultSize;
    return { xMm: 0, yMm: 0, wMm: size.widthMm, hMm: size.heightMm };
}
/** Align selection: to the card when one item is selected, else to the selection bounds. */
export function alignSelection(mode) {
    const s = useEditor.getState();
    const els = selectedElements(s).filter((e) => isLayoutEditable(s, e.id));
    if (!els.length)
        return;
    const boxes = els.map((e) => elementBounds(e)).filter(Boolean);
    const ref = els.length === 1 ? cardBounds(s) : unionBounds(boxes);
    const deltas = alignDeltas(boxes, ref, mode);
    const byId = new Map(els.map((e, i) => [e.id, deltas[i]]));
    updateElements([...byId.keys()], (el) => {
        const dlt = byId.get(el.id);
        translateElement(el, dlt.dx, dlt.dy);
    });
}
export function distributeSelection(axis) {
    const s = useEditor.getState();
    const els = selectedElements(s).filter((e) => isLayoutEditable(s, e.id));
    if (els.length < 3)
        return;
    const deltas = distributeDeltas(els.map((e) => elementBounds(e)), axis);
    const byId = new Map(els.map((e, i) => [e.id, deltas[i]]));
    updateElements([...byId.keys()], (el) => {
        const dlt = byId.get(el.id);
        translateElement(el, dlt.dx, dlt.dy);
    });
}
// ---------- guides (stored on the active template) ----------
function guideTemplateId(s) {
    return activeTemplate(s)?.id;
}
export function addGuide(axis, posMm) {
    const s = useEditor.getState();
    const tid = guideTemplateId(s);
    if (!tid)
        return;
    const id = newId();
    commit((d) => void d.templates[tid].guides.push({ id, axis, posMm }));
    return id;
}
export function moveGuide(id, posMm, coalesce) {
    const s = useEditor.getState();
    const tid = guideTemplateId(s);
    if (!tid)
        return;
    commit((d) => {
        const g = d.templates[tid].guides.find((x) => x.id === id);
        if (g)
            g.posMm = posMm;
    }, coalesce);
}
export function removeGuide(id) {
    const s = useEditor.getState();
    const tid = guideTemplateId(s);
    if (!tid)
        return;
    commit((d) => {
        d.templates[tid].guides = d.templates[tid].guides.filter((g) => g.id !== id);
    });
}
export function select(ids) {
    setView({
        selection: ids,
        editingTextId: null,
        cropId: view().cropId && ids.includes(view().cropId) ? view().cropId : null,
    });
}
