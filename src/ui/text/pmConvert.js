import { normalizeRichText, resolveStyle } from '@/core/text/richtext';
/**
 * RichText ⇄ ProseMirror JSON. In the editor every run carries its full
 * resolved style as marks (so "not bold" on a bold base is expressible);
 * converting back stores only differences from the element's base style.
 */
export function toPM(rt, base, align, lineHeight) {
    return {
        type: 'doc',
        content: rt.paragraphs.map((p) => ({
            type: 'paragraph',
            attrs: { textAlign: p.align ?? align, lineHeight: String(p.lineHeight ?? lineHeight) },
            content: p.runs.filter((r) => r.text).map((r) => runToPM(r, base)),
        })),
    };
}
function runToPM(r, base) {
    const s = resolveStyle(base, r.style);
    const marks = [];
    if (s.bold)
        marks.push({ type: 'bold' });
    if (s.italic)
        marks.push({ type: 'italic' });
    if (s.underline)
        marks.push({ type: 'underline' });
    marks.push({
        type: 'textStyle',
        attrs: {
            fontFamily: s.fontFamily,
            fontSize: `${s.sizePt}pt`,
            color: s.color,
            letterSpacing: s.letterSpacingEm ? `${s.letterSpacingEm}em` : null,
        },
    });
    return { type: 'text', text: r.text, marks };
}
export function fromPM(doc, base, align, lineHeight) {
    const paragraphs = (doc.content ?? []).map((p) => {
        const para = { runs: [] };
        const a = p.attrs?.textAlign;
        if (a && a !== align)
            para.align = a;
        const lh = parseFloat(String(p.attrs?.lineHeight ?? ''));
        if (Number.isFinite(lh) && Math.abs(lh - lineHeight) > 1e-6)
            para.lineHeight = lh;
        for (const n of p.content ?? []) {
            if (n.type !== 'text' || !n.text)
                continue;
            const marks = n.marks ?? [];
            // Every run we hand to the editor carries a textStyle mark. Text without one was
            // typed after all marks were cleared (e.g. replacing a full selection): it inherits.
            if (!marks.some((m) => m.type === 'textStyle'))
                para.runs.push({ text: n.text });
            else
                para.runs.push({ text: n.text, ...diffStyle(styleFromMarks(marks, base), base) });
        }
        return para;
    });
    return normalizeRichText({ paragraphs });
}
function styleFromMarks(marks, base) {
    const s = { ...base, bold: false, italic: false, underline: false };
    for (const m of marks) {
        if (m.type === 'bold')
            s.bold = true;
        if (m.type === 'italic')
            s.italic = true;
        if (m.type === 'underline')
            s.underline = true;
        if (m.type === 'textStyle') {
            const a = m.attrs ?? {};
            if (a.fontFamily)
                s.fontFamily = String(a.fontFamily).replace(/^["']|["']$/g, '');
            if (a.fontSize) {
                const v = parseFloat(String(a.fontSize));
                if (Number.isFinite(v))
                    s.sizePt = String(a.fontSize).endsWith('px') ? (v * 72) / 96 : v;
            }
            if (a.color)
                s.color = normaliseColor(String(a.color));
            if (a.letterSpacing) {
                const v = parseFloat(String(a.letterSpacing));
                if (Number.isFinite(v))
                    s.letterSpacingEm = v;
            }
        }
    }
    return s;
}
function diffStyle(s, base) {
    const d = {};
    for (const k of Object.keys(s)) {
        if (s[k] !== base[k])
            d[k] = s[k];
    }
    return Object.keys(d).length ? { style: d } : {};
}
/** Browsers report colours as rgb(); store hex. */
export function normaliseColor(c) {
    const m = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c);
    if (!m)
        return c.toLowerCase();
    return ('#' +
        m
            .slice(1, 4)
            .map((x) => Number(x).toString(16).padStart(2, '0'))
            .join(''));
}
