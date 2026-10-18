/** Rows whose object identity changed between two id maps (immer keeps unchanged rows identical). */
export function diffById(prev, next) {
    const put = [];
    const del = [];
    const p = prev ?? {};
    const n = next ?? {};
    for (const id in n)
        if (p[id] !== n[id])
            put.push(n[id]);
    for (const id in p)
        if (!(id in n))
            del.push(id);
    return { put, del };
}
