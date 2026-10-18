import { ptToMm } from '../units/units';
import { resolveStyle } from './richtext';
/** Split runs into words and whitespace, keeping styles. */
function pieces(runs) {
    const out = [];
    for (const r of runs) {
        for (const m of r.text.matchAll(/\s+|[^\s]+/g)) {
            out.push({ text: m[0], style: r.style, space: /^\s+$/.test(m[0]) });
        }
    }
    return out;
}
function layoutOnce(input, m, scale) {
    const sizeOf = (s) => ptToMm(s.sizePt) * scale;
    const measure = (text, s) => {
        const size = sizeOf(s);
        return m.width(text, s, size) + s.letterSpacingEm * size * [...text].length;
    };
    const lines = [];
    let y = 0;
    let tooWide = false;
    for (const para of input.text.paragraphs) {
        const align = para.align ?? input.align;
        const lh = para.lineHeight ?? input.lineHeight;
        const runs = para.runs.map((r) => ({
            text: r.text,
            style: resolveStyle(input.baseStyle, r.style),
        }));
        const ps = pieces(runs);
        // Empty paragraph still takes one line at the base (or first run) size.
        const emptyStyle = runs[0]?.style ?? input.baseStyle;
        let current = [];
        let currentW = 0;
        const paraLines = [];
        const pushLine = () => {
            // drop trailing whitespace
            while (current.length && /^\s+$/.test(current[current.length - 1].text))
                current.pop();
            paraLines.push(current);
            current = [];
            currentW = 0;
        };
        for (const p of ps) {
            const w = measure(p.text, p.style);
            const size = sizeOf(p.style);
            if (p.space) {
                if (!current.length)
                    continue; // no leading spaces after a wrap
                current.push({ text: p.text, style: p.style, sizeMm: size, width: w });
                currentW += w;
                continue;
            }
            if (currentW + w <= input.width + 1e-6 || !current.length) {
                if (w > input.width + 1e-6) {
                    // A single word wider than the box: break it by characters.
                    tooWide = true;
                    let chunk = '';
                    for (const ch of p.text) {
                        const cw = measure(chunk + ch, p.style);
                        if (currentW + cw > input.width + 1e-6 && (chunk || current.length)) {
                            if (chunk)
                                current.push({
                                    text: chunk,
                                    style: p.style,
                                    sizeMm: size,
                                    width: measure(chunk, p.style),
                                });
                            pushLine();
                            chunk = ch;
                        }
                        else
                            chunk += ch;
                    }
                    if (chunk) {
                        const cw = measure(chunk, p.style);
                        current.push({ text: chunk, style: p.style, sizeMm: size, width: cw });
                        currentW += cw;
                    }
                    continue;
                }
                current.push({ text: p.text, style: p.style, sizeMm: size, width: w });
                currentW += w;
            }
            else {
                pushLine();
                current.push({ text: p.text, style: p.style, sizeMm: size, width: w });
                currentW = w;
            }
        }
        pushLine();
        paraLines.forEach((frags, li) => {
            const sizes = frags.length ? frags.map((f) => f.sizeMm) : [sizeOf(emptyStyle)];
            const styles = frags.length ? frags.map((f) => f.style) : [emptyStyle];
            const maxSize = Math.max(...sizes);
            const height = maxSize * lh;
            // Baseline: half-leading model, using the tallest font's metrics.
            let asc = 0;
            let desc = 0;
            styles.forEach((s, i) => {
                const mt = m.metrics(s, sizes[i]);
                asc = Math.max(asc, mt.ascent);
                desc = Math.max(desc, mt.descent);
            });
            const baseline = y + (height - (asc + desc)) / 2 + asc;
            const width = frags.reduce((a, f) => a + f.width, 0);
            const isLast = li === paraLines.length - 1;
            let x = align === 'center' ? (input.width - width) / 2 : align === 'right' ? input.width - width : 0;
            let extraPerSpace = 0;
            if (align === 'justify' && !isLast) {
                const spaces = frags.filter((f) => /^\s+$/.test(f.text)).length;
                if (spaces)
                    extraPerSpace = (input.width - width) / spaces;
            }
            const placed = frags.map((f) => {
                const out = { ...f, x };
                x += f.width + (/^\s+$/.test(f.text) ? extraPerSpace : 0);
                return out;
            });
            lines.push({
                y,
                height,
                baseline,
                width: align === 'justify' && !isLast ? input.width : width,
                fragments: placed,
            });
            y += height;
        });
    }
    return { lines, height: y, tooWide };
}
/** Largest font size (pt) used anywhere in the text. */
function maxPt(input) {
    let max = input.baseStyle.sizePt;
    for (const p of input.text.paragraphs)
        for (const r of p.runs)
            if (r.style?.sizePt)
                max = Math.max(max, r.style.sizePt);
    return max;
}
/**
 * Lay out rich text in a box. With auto-shrink, all sizes scale down together
 * until the text fits, but never below `minPt` for the largest run.
 */
export function layoutText(input, m) {
    let scale = 1;
    let res = layoutOnce(input, m, 1);
    const fits = (r) => r.height <= input.height + 1e-6 && !r.tooWide;
    if (input.autoShrink?.enabled && !fits(res)) {
        const minScale = Math.min(1, input.autoShrink.minPt / maxPt(input));
        const atMin = layoutOnce(input, m, minScale);
        if (!fits(atMin)) {
            scale = minScale;
            res = atMin;
        }
        else {
            let lo = minScale;
            let hi = 1;
            let best = atMin;
            for (let i = 0; i < 14; i++) {
                const mid = (lo + hi) / 2;
                const r = layoutOnce(input, m, mid);
                if (fits(r)) {
                    lo = mid;
                    best = r;
                }
                else
                    hi = mid;
            }
            scale = lo;
            res = best;
        }
    }
    const overflow = !fits(res);
    const free = input.height - res.height;
    const offsetY = input.vAlign === 'middle' ? free / 2 : input.vAlign === 'bottom' ? free : 0;
    return { lines: res.lines, height: res.height, scale, overflow, offsetY: Math.max(0, offsetY) };
}
