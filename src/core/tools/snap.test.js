import { describe, expect, it } from 'vitest';
import { alignDeltas, distributeDeltas } from './align';
import { buildTargets, snapBox, snapPoint } from './snap';
const targets = buildTargets({
    widthMm: 86,
    heightMm: 54,
    bleedMm: 3,
    safeMm: 3,
    guides: [{ axis: 'x', posMm: 20 }],
    others: [{ xMm: 50, yMm: 10, wMm: 10, hMm: 10 }],
});
describe('snapBox', () => {
    it('snaps the left edge to the card edge', () => {
        const r = snapBox({ xMm: 0.6, yMm: 30, wMm: 10, hMm: 7 }, targets, 1);
        expect(r.dx).toBeCloseTo(-0.6);
        expect(r.linesX).toContain(0);
    });
    it('snaps the centre to the card centre', () => {
        const r = snapBox({ xMm: 37.6, yMm: 30, wMm: 10, hMm: 7 }, targets, 1);
        expect(r.dx).toBeCloseTo(43 - 42.6);
        expect(r.linesX).toContain(43);
    });
    it('snaps to guides and other elements', () => {
        expect(snapBox({ xMm: 20.4, yMm: 30, wMm: 5, hMm: 5 }, targets, 1).dx).toBeCloseTo(-0.4);
        // bottom edge 19.7 → other element's bottom at 20
        expect(snapBox({ xMm: 70, yMm: 14.7, wMm: 5, hMm: 5 }, targets, 1).dy).toBeCloseTo(0.3);
    });
    it('does not snap outside the threshold', () => {
        const r = snapBox({ xMm: 8, yMm: 30.2, wMm: 3, hMm: 3 }, targets, 0.5);
        expect(r).toEqual({ dx: 0, dy: 0, linesX: [], linesY: [] });
    });
    it('snaps to bleed and safe lines', () => {
        expect(snapBox({ xMm: -2.7, yMm: 30, wMm: 3, hMm: 3 }, targets, 0.5).dx).toBeCloseTo(-0.3);
        expect(snapBox({ xMm: 3.2, yMm: 30, wMm: 1, hMm: 1 }, targets, 0.5).dx).toBeCloseTo(-0.2);
    });
});
describe('snapPoint', () => {
    it('snaps each axis independently', () => {
        const p = snapPoint({ x: 85.8, y: 25 }, targets, 0.5);
        expect(p.x).toBe(86);
        expect(p.y).toBe(25);
        expect(p.linesX).toEqual([86]);
    });
});
describe('align and distribute', () => {
    const boxes = [
        { xMm: 5, yMm: 5, wMm: 10, hMm: 10 },
        { xMm: 30, yMm: 20, wMm: 20, hMm: 5 },
    ];
    it('aligns to a reference box', () => {
        const card = { xMm: 0, yMm: 0, wMm: 86, hMm: 54 };
        expect(alignDeltas(boxes, card, 'right')).toEqual([
            { dx: 71, dy: 0 },
            { dx: 36, dy: 0 },
        ]);
        expect(alignDeltas(boxes, card, 'vcenter')).toEqual([
            { dx: 0, dy: 17 },
            { dx: 0, dy: 4.5 },
        ]);
    });
    it('distributes with equal gaps', () => {
        const three = [
            { xMm: 0, yMm: 0, wMm: 10, hMm: 1 },
            { xMm: 60, yMm: 0, wMm: 10, hMm: 1 },
            { xMm: 12, yMm: 0, wMm: 10, hMm: 1 },
        ];
        const d = distributeDeltas(three, 'x');
        expect(d[0].dx).toBe(0);
        expect(d[1].dx).toBe(0);
        expect(d[2].dx).toBe(30 - 12);
    });
});
