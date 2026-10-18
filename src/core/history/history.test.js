import { describe, expect, it } from 'vitest';
import { History } from './history';
describe('History', () => {
    it('undoes and redoes snapshots in order', () => {
        const h = new History();
        h.record(0);
        h.record(1);
        expect(h.undo(2)).toBe(1);
        expect(h.undo(1)).toBe(0);
        expect(h.undo(0)).toBeUndefined();
        expect(h.redo(0)).toBe(1);
        expect(h.redo(1)).toBe(2);
        expect(h.canRedo).toBe(false);
    });
    it('coalesces commits with the same key inside the window', () => {
        const h = new History();
        h.record(0, 'drag', 1000);
        h.record(1, 'drag', 1100);
        h.record(2, 'drag', 1200);
        expect(h.undo(3)).toBe(0);
        expect(h.canUndo).toBe(false);
    });
    it('starts a new step when the key changes or the window passes', () => {
        const h = new History();
        h.record(0, 'a', 0);
        h.record(1, 'b', 10);
        h.record(2, 'b', 5000);
        expect(h.undo(3)).toBe(2);
        expect(h.undo(2)).toBe(1);
        expect(h.undo(1)).toBe(0);
    });
    it('clears redo on a new change', () => {
        const h = new History();
        h.record(0);
        h.undo(1);
        h.record(0);
        expect(h.canRedo).toBe(false);
    });
});
