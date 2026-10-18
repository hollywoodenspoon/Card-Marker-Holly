import { produce } from 'immer';
import { create } from 'zustand';
import { History } from '../history/history';
import { flatten } from '../model/tree';
import { surfaceElements } from './selectors';
export const initialView = {
    mode: 'card',
    cardId: null,
    side: 'front',
    templateId: null,
    selection: [],
    editingTextId: null,
    cropId: null,
    showOverlay: true,
    snapping: true,
};
export const useEditor = create(() => ({
    doc: null,
    library: { assets: {}, fonts: {} },
    view: initialView,
    canUndo: false,
    canRedo: false,
}));
const history = new History();
const syncHistoryFlags = () => useEditor.setState({ canUndo: history.canUndo, canRedo: history.canRedo });
export function openDoc(doc, library, view = {}) {
    history.clear();
    useEditor.setState({ doc, library, view: { ...initialView, ...view } });
    syncHistoryFlags();
}
export function closeDoc() {
    history.clear();
    useEditor.setState({ doc: null, library: { assets: {}, fonts: {} }, view: initialView });
    syncHistoryFlags();
}
/**
 * Apply an undoable change to the document. Pass a `coalesce` key to merge
 * a burst of changes (a drag, typing) into one undo step.
 */
export function commit(recipe, coalesce) {
    const { doc } = useEditor.getState();
    if (!doc)
        return;
    const next = produce(doc, recipe);
    if (next === doc)
        return;
    history.record(doc, coalesce);
    useEditor.setState({ doc: next });
    syncHistoryFlags();
}
/** End the current coalescing run (e.g. at pointerup). */
export function endGesture() {
    history.breakCoalescing();
}
export function undo() {
    const { doc } = useEditor.getState();
    if (!doc)
        return;
    const prev = history.undo(doc);
    if (prev) {
        useEditor.setState({ doc: prev });
        pruneSelection();
    }
    syncHistoryFlags();
}
export function redo() {
    const { doc } = useEditor.getState();
    if (!doc)
        return;
    const next = history.redo(doc);
    if (next) {
        useEditor.setState({ doc: next });
        pruneSelection();
    }
    syncHistoryFlags();
}
export function updateLibrary(recipe) {
    useEditor.setState((s) => ({ library: produce(s.library, recipe) }));
}
export function setView(patch) {
    useEditor.setState((s) => ({
        view: { ...s.view, ...(typeof patch === 'function' ? patch(s.view) : patch) },
    }));
}
/** Remove selected ids that no longer exist after undo/redo. */
function pruneSelection() {
    const s = useEditor.getState();
    if (!s.view.selection.length)
        return;
    const all = new Set(flatten(surfaceElements(s)).map((e) => e.id));
    const sel = s.view.selection.filter((id) => all.has(id));
    if (sel.length !== s.view.selection.length)
        setView({ selection: sel });
}
