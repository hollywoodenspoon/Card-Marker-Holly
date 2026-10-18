export function buildTargets(opts) {
    const { widthMm: w, heightMm: h, bleedMm: b, safeMm: s } = opts;
    const x = [0, w / 2, w];
    const y = [0, h / 2, h];
    if (b > 0) {
        x.push(-b, w + b);
        y.push(-b, h + b);
    }
    if (s > 0) {
        x.push(s, w - s);
        y.push(s, h - s);
    }
    for (const g of opts.guides)
        (g.axis === 'x' ? x : y).push(g.posMm);
    for (const o of opts.others) {
        x.push(o.xMm, o.xMm + o.wMm / 2, o.xMm + o.wMm);
        y.push(o.yMm, o.yMm + o.hMm / 2, o.yMm + o.hMm);
    }
    return { x, y };
}
/** Best offset bringing any of `values` onto any of `lines` within `threshold`. */
function bestDelta(values, lines, threshold) {
    let best = null;
    for (const v of values)
        for (const l of lines) {
            const d = l - v;
            if (Math.abs(d) <= threshold && (best === null || Math.abs(d) < Math.abs(best)))
                best = d;
        }
    return best;
}
const EPS = 1e-6;
const hits = (values, lines) => [
    ...new Set(lines.filter((l) => values.some((v) => Math.abs(v - l) < EPS))),
];
/** Snap a moving box's edges and centre to the targets. */
export function snapBox(box, t, thresholdMm) {
    const xs = [box.xMm, box.xMm + box.wMm / 2, box.xMm + box.wMm];
    const ys = [box.yMm, box.yMm + box.hMm / 2, box.yMm + box.hMm];
    const dx = bestDelta(xs, t.x, thresholdMm) ?? 0;
    const dy = bestDelta(ys, t.y, thresholdMm) ?? 0;
    return {
        dx,
        dy,
        linesX: hits(xs.map((v) => v + dx), t.x),
        linesY: hits(ys.map((v) => v + dy), t.y),
    };
}
/** Snap a single point (a resize handle). */
export function snapPoint(p, t, thresholdMm) {
    const dx = bestDelta([p.x], t.x, thresholdMm);
    const dy = bestDelta([p.y], t.y, thresholdMm);
    const x = p.x + (dx ?? 0);
    const y = p.y + (dy ?? 0);
    return { x, y, linesX: dx !== null ? [x] : [], linesY: dy !== null ? [y] : [] };
}
