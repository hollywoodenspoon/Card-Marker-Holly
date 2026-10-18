/**
 * Snapshot-based undo/redo. Snapshots are immutable (immer), so storing
 * them is cheap thanks to structural sharing.
 *
 * Consecutive commits with the same coalesce key inside `windowMs` merge
 * into one undo step (a drag gesture, typing into a field, a slider).
 */
export class History {
    limit;
    windowMs;
    past = [];
    future = [];
    lastKey = null;
    lastTime = 0;
    constructor(limit = 200, windowMs = 1500) {
        this.limit = limit;
        this.windowMs = windowMs;
    }
    /** Record `before` as an undo point prior to a change. */
    record(before, coalesceKey, now = Date.now()) {
        const merge = coalesceKey !== undefined &&
            coalesceKey === this.lastKey &&
            now - this.lastTime < this.windowMs;
        this.lastKey = coalesceKey ?? null;
        this.lastTime = now;
        this.future = [];
        if (merge)
            return;
        this.past.push(before);
        if (this.past.length > this.limit)
            this.past.shift();
    }
    /** Stop the current coalescing run so the next change starts a new step. */
    breakCoalescing() {
        this.lastKey = null;
    }
    undo(current) {
        const prev = this.past.pop();
        if (prev === undefined)
            return undefined;
        this.future.push(current);
        this.lastKey = null;
        return prev;
    }
    redo(current) {
        const next = this.future.pop();
        if (next === undefined)
            return undefined;
        this.past.push(current);
        this.lastKey = null;
        return next;
    }
    clear() {
        this.past = [];
        this.future = [];
        this.lastKey = null;
    }
    get canUndo() {
        return this.past.length > 0;
    }
    get canRedo() {
        return this.future.length > 0;
    }
}
