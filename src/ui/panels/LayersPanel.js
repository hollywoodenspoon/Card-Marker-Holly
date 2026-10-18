import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronRight, Eye, EyeOff, Folder, GripVertical, Image as ImageIcon, ImagePlus, Lock, LockOpen, Shapes, Type, } from 'lucide-react';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditor } from '@/core/editor/editorStore';
import { moveElementTo, select } from '@/core/editor/elementCommands';
import { activeTemplate, currentCard, isLayoutEditable, localElements, } from '@/core/editor/selectors';
import { cn } from '@/lib/cn';
import { toggleEditLock, toggleVisibility, renameElement } from '@/templates/commands';
import { isVisibleOnCard } from '@/templates/resolve';
import { IconButton } from '@/ui/components/ui/button';
import { useReorder } from '@/ui/components/useReorder';
export function LayersPanel() {
    const mode = useEditor((s) => s.view.mode);
    const template = useEditor(activeTemplate);
    const local = useEditor(useShallow(localElements));
    return (_jsxs("div", { className: "min-h-0 flex-1 overflow-auto pb-4", children: [mode === 'card' && local.length > 0 && (_jsxs(_Fragment, { children: [_jsx(Heading, { children: "This card only" }), _jsx(LayerList, { elements: local, depth: 0 })] })), _jsx(Heading, { children: mode === 'card'
                    ? `Template parts · ${template?.name ?? 'none'}`
                    : (template?.name ?? 'Template') }), template?.elements.length ? (_jsx(LayerList, { elements: template.elements, depth: 0 })) : (_jsx("p", { className: "px-4 py-2 text-sm text-muted-foreground", children: "No layers yet. Add text, an image or a shape." })), mode === 'card' && (_jsx("p", { className: "px-4 pt-3 text-xs text-muted-foreground", children: "Use the eye to hide a template part on this card only. Other parts stay where they are." }))] }));
}
function Heading({ children }) {
    return (_jsx("div", { className: "px-4 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: children }));
}
function LayerList({ elements, depth }) {
    const display = [...elements].reverse();
    const { handleProps, rowRef, dragging } = useReorder((from, to) => {
        const el = display[from];
        moveElementTo(el.id, elements.length - 1 - to);
    });
    return (_jsx("ul", { children: display.map((el, i) => (_jsxs("li", { ref: rowRef(i), children: [dragging && dragging.over === i && dragging.from !== i && _jsx(DropLine, { depth: depth }), _jsx(LayerRow, { el: el, depth: depth, handle: handleProps(i), dragged: dragging?.from === i }), dragging && i === display.length - 1 && dragging.over === display.length && (_jsx(DropLine, { depth: depth }))] }, el.id))) }));
}
const DropLine = ({ depth }) => (_jsx("div", { className: "h-0.5 rounded bg-accent", style: { marginLeft: 16 + depth * 16, marginRight: 8 } }));
const ICONS = { text: Type, imageField: ImagePlus, image: ImageIcon, shape: Shapes, group: Folder };
function LayerRow({ el, depth, handle, dragged, }) {
    const selected = useEditor((s) => s.view.selection.includes(el.id));
    const mode = useEditor((s) => s.view.mode);
    const editable = useEditor((s) => isLayoutEditable(s, el.id));
    const visible = useEditor((s) => {
        if (s.view.mode === 'card' && !editable)
            return isVisibleOnCard(el, currentCard(s));
        return el.defaultVisible;
    });
    const [open, setOpen] = useState(true);
    const [renaming, setRenaming] = useState(false);
    const Icon = ICONS[el.type];
    const canToggle = mode === 'template' || editable || !el.toggleLocked;
    const isField = el.type === 'text' || el.type === 'imageField';
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: cn('mx-2 flex h-11 items-center gap-1 rounded-lg pr-1 md:h-9', selected ? 'bg-accent-soft' : 'hover:bg-muted', dragged && 'opacity-50', !visible && 'text-muted-foreground'), style: { paddingLeft: 4 + depth * 16 }, children: [editable ? (_jsx("span", { ...handle, "aria-label": `Drag to reorder ${el.name}`, role: "button", className: "grid h-full w-6 shrink-0 place-items-center text-muted-foreground", children: _jsx(GripVertical, { className: "size-3.5" }) })) : (_jsx("span", { className: "w-6 shrink-0" })), el.type === 'group' ? (_jsx("button", { type: "button", "aria-label": open ? 'Collapse group' : 'Expand group', onClick: () => setOpen(!open), className: "grid size-6 shrink-0 place-items-center", children: _jsx(ChevronRight, { className: cn('size-3.5 transition-transform', open && 'rotate-90') }) })) : null, _jsxs("button", { type: "button", className: "flex h-full min-w-0 flex-1 items-center gap-2 text-left", onClick: (e) => {
                            const s = useEditor.getState().view.selection;
                            if (e.shiftKey || e.metaKey || e.ctrlKey)
                                select(s.includes(el.id) ? s.filter((x) => x !== el.id) : [...s, el.id]);
                            else
                                select([el.id]);
                        }, onDoubleClick: () => editable && setRenaming(true), children: [_jsx(Icon, { className: "size-4 shrink-0 text-muted-foreground" }), renaming ? (_jsx("input", { autoFocus: true, defaultValue: el.name, "aria-label": "Layer name", className: "h-7 min-w-0 flex-1 rounded border border-accent bg-panel px-1.5 text-sm outline-none", onClick: (e) => e.stopPropagation(), onBlur: (e) => {
                                    const v = e.target.value.trim();
                                    if (v && v !== el.name)
                                        renameElement(el.id, v);
                                    setRenaming(false);
                                }, onKeyDown: (e) => {
                                    if (e.key === 'Enter')
                                        e.currentTarget.blur();
                                    if (e.key === 'Escape')
                                        setRenaming(false);
                                } })) : (_jsxs("span", { className: "truncate text-sm", children: [el.name, isField && _jsx("span", { className: "ml-1.5 text-[10px] text-accent uppercase", children: "field" })] }))] }), _jsx(IconButton, { label: visible ? `Hide ${el.name}` : `Show ${el.name}`, size: "icon-sm", disabled: !canToggle, title: !canToggle ? 'This part is always shown' : undefined, onClick: () => toggleVisibility(el.id), children: visible ? _jsx(Eye, {}) : _jsx(EyeOff, {}) }), editable && (_jsx(IconButton, { label: el.editLocked ? `Unlock ${el.name}` : `Lock ${el.name}`, size: "icon-sm", onClick: () => toggleEditLock(el.id), className: cn(!el.editLocked && 'text-muted-foreground/60'), children: el.editLocked ? _jsx(Lock, {}) : _jsx(LockOpen, {}) }))] }), el.type === 'group' && open && _jsx(LayerList, { elements: el.children, depth: depth + 1 })] }));
}
