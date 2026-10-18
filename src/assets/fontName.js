/**
 * Minimal reader for the sfnt `name` table (TTF and OTF share this layout).
 * Returns the family and subfamily (style) names.
 */
export function readFontNames(buf) {
    try {
        const v = new DataView(buf);
        const numTables = v.getUint16(4);
        let nameOffset = -1;
        for (let i = 0; i < numTables; i++) {
            const rec = 12 + i * 16;
            const tag = String.fromCharCode(v.getUint8(rec), v.getUint8(rec + 1), v.getUint8(rec + 2), v.getUint8(rec + 3));
            if (tag === 'name')
                nameOffset = v.getUint32(rec + 8);
        }
        if (nameOffset < 0)
            return {};
        const count = v.getUint16(nameOffset + 2);
        const strings = nameOffset + v.getUint16(nameOffset + 4);
        const found = {};
        for (let i = 0; i < count; i++) {
            const r = nameOffset + 6 + i * 12;
            const platform = v.getUint16(r);
            const nameId = v.getUint16(r + 6);
            const len = v.getUint16(r + 8);
            const off = strings + v.getUint16(r + 10);
            if (![1, 2, 4, 16, 17].includes(nameId))
                continue;
            let str = '';
            if (platform === 0 || platform === 3) {
                for (let j = 0; j < len; j += 2)
                    str += String.fromCharCode(v.getUint16(off + j));
            }
            else if (platform === 1) {
                for (let j = 0; j < len; j++)
                    str += String.fromCharCode(v.getUint8(off + j));
            }
            else
                continue;
            // Prefer Windows/Unicode entries, which come later for the same id.
            if (!found[nameId] || platform !== 1)
                found[nameId] = str;
        }
        return { family: found[16] || found[1], subfamily: found[17] || found[2] };
    }
    catch {
        return {};
    }
}
/** CSS weight/style descriptors from a subfamily name like "Bold Italic". */
export function styleFromSubfamily(sub = '') {
    const s = sub.toLowerCase();
    const style = /italic|oblique/.test(s) ? 'italic' : 'normal';
    const weights = [
        [/thin|hairline/, 100],
        [/extra ?light|ultra ?light/, 200],
        [/light/, 300],
        [/medium/, 500],
        [/semi ?bold|demi ?bold/, 600],
        [/extra ?bold|ultra ?bold/, 800],
        [/black|heavy/, 900],
        [/bold/, 700],
    ];
    const w = weights.find(([re]) => re.test(s))?.[1] ?? 400;
    return { weight: String(w), style };
}
