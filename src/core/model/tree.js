import { newId } from './ids';
/** Depth-first, bottom-to-top. `parents` lists ancestors from outermost. */
export function walk(els, fn, parents = []) {
    for (const el of els) {
        fn(el, parents);
        if (el.type === 'group')
            walk(el.children, fn, [...parents, el]);
    }
}
export function flatten(els) {
    const out = [];
    walk(els, (e) => out.push(e));
    return out;
}
export function findElement(els, id) {
    for (const el of els) {
        if (el.id === id)
            return el;
        if (el.type === 'group') {
            const f = findElement(el.children, id);
            if (f)
                return f;
        }
    }
    return undefined;
}
export function findParent(els, id) {
    for (const el of els) {
        if (el.id === id)
            return null;
        if (el.type === 'group') {
            if (el.children.some((c) => c.id === id))
                return el;
            const f = findParent(el.children, id);
            if (f !== undefined)
                return f;
        }
    }
    return undefined;
}
/** The sibling list containing `id`, or undefined. Mutates nothing. */
export function siblingsOf(els, id) {
    if (els.some((e) => e.id === id))
        return els;
    for (const el of els) {
        if (el.type === 'group') {
            const s = siblingsOf(el.children, id);
            if (s)
                return s;
        }
    }
    return undefined;
}
/** Remove elements by id anywhere in the tree (in place on an immer draft). */
export function removeElements(els, ids) {
    for (let i = els.length - 1; i >= 0; i--) {
        const el = els[i];
        if (ids.has(el.id))
            els.splice(i, 1);
        else if (el.type === 'group')
            removeElements(el.children, ids);
    }
    return els;
}
/** Deep copy with fresh ids. */
export function cloneWithNewIds(el) {
    const copy = structuredClone(el);
    const reid = (e) => {
        e.id = newId();
        if (e.type === 'group')
            e.children.forEach(reid);
    };
    reid(copy);
    return copy;
}
/** Axis-aligned bounds of an element, accounting for rotation (around top-left). */
export function elementBounds(el) {
    if (el.type === 'group')
        return unionBounds(el.children.map(elementBounds));
    const r = (el.rotation * Math.PI) / 180;
    const cos = Math.cos(r);
    const sin = Math.sin(r);
    const pts = [
        [0, 0],
        [el.wMm, 0],
        [el.wMm, el.hMm],
        [0, el.hMm],
    ].map(([x, y]) => [el.xMm + x * cos - y * sin, el.yMm + x * sin + y * cos]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { xMm: x0, yMm: y0, wMm: Math.max(...xs) - x0, hMm: Math.max(...ys) - y0 };
}
export function unionBounds(list) {
    const bs = list.filter((b) => !!b);
    if (!bs.length)
        return null;
    const x0 = Math.min(...bs.map((b) => b.xMm));
    const y0 = Math.min(...bs.map((b) => b.yMm));
    const x1 = Math.max(...bs.map((b) => b.xMm + b.wMm));
    const y1 = Math.max(...bs.map((b) => b.yMm + b.hMm));
    return { xMm: x0, yMm: y0, wMm: x1 - x0, hMm: y1 - y0 };
}
/** Translate an element (and group children) by dx/dy mm, in place. */
export function translateElement(el, dx, dy) {
    if (el.type === 'group')
        el.children.forEach((c) => translateElement(c, dx, dy));
    else {
        el.xMm += dx;
        el.yMm += dy;
    }
}
export function fieldNames(els) {
    const names = [];
    walk(els, (e) => {
        if ((e.type === 'text' || e.type === 'imageField') && !names.includes(e.fieldName))
            names.push(e.fieldName);
    });
    return names;
}
/** Pick a name not used yet, e.g. "Text 2". */
export function uniqueName(base, taken) {
    const set = new Set(taken);
    if (!set.has(base))
        return base;
    let i = 2;
    while (set.has(`${base} ${i}`))
        i++;
    return `${base} ${i}`;
}
