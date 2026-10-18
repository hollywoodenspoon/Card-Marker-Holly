import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, Copy, GripVertical, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { addCard, deleteCard, duplicateCard, moveCard, renameCard, selectCard, } from '@/core/editor/cardCommands';
import { useEditor } from '@/core/editor/editorStore';
import { cn } from '@/lib/cn';
import { Button, IconButton } from '@/ui/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/ui/components/ui/dropdown';
import { Input } from '@/ui/components/ui/input';
import { useReorder } from '@/ui/components/useReorder';
import { CardThumb as LiveThumb } from '@/ui/canvas/CardThumb';
export function CardsPanel({ onPicked }) {
    const cards = useEditor((s) => s.doc?.cards);
    const currentId = useEditor((s) => s.view.cardId);
    const [q, setQ] = useState('');
    const list = useMemo(() => (cards ? Object.values(cards).sort((a, b) => a.order - b.order) : []), [cards]);
    const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())) : list;
    const { handleProps, rowRef, dragging } = useReorder((from, to) => moveCard(filtered[from].id, to));
    return (_jsxs("div", { className: "flex min-h-0 flex-1 flex-col", children: [_jsxs("div", { className: "flex items-center gap-2 p-3", children: [_jsxs("div", { className: "relative flex-1", children: [_jsx(Search, { className: "pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" }), _jsx(Input, { value: q, onChange: (e) => setQ(e.target.value), placeholder: "Search cards", "aria-label": "Search cards", className: "pl-8" })] }), _jsxs("div", { className: "flex", children: [_jsxs(Button, { size: "sm", className: "rounded-r-none", onClick: () => addCard(), title: "New card with the same templates and part toggles as the current card", children: [_jsx(Plus, {}), " Card"] }), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(Button, { size: "sm", className: "rounded-l-none border-l border-white/20 px-2", "aria-label": "More ways to add a card", children: _jsx(ChevronDown, {}) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuItem, { onSelect: () => addCard(), children: "New card using previous card's layout" }), _jsx(DropdownMenuItem, { onSelect: () => addCard({ blank: true }), children: "New card with default toggles" })] })] })] })] }), _jsxs("ul", { className: "min-h-0 flex-1 space-y-1 overflow-auto px-2 pb-3", children: [filtered.map((c, i) => (_jsxs("li", { ref: rowRef(i), children: [dragging && dragging.over === i && dragging.from !== i && _jsx(DropLine, {}), _jsx(CardRow, { card: c, active: c.id === currentId, handle: q ? undefined : handleProps(i), dragged: dragging?.from === i, onPick: () => {
                                    selectCard(c.id);
                                    onPicked?.();
                                } }), dragging && i === filtered.length - 1 && dragging.over === filtered.length && (_jsx(DropLine, {}))] }, c.id))), !filtered.length && (_jsx("li", { className: "p-4 text-center text-sm text-muted-foreground", children: q ? 'No cards match.' : 'No cards yet.' }))] })] }));
}
const DropLine = () => _jsx("div", { className: "mx-2 h-0.5 rounded bg-accent" });
function CardRow({ card, active, onPick, handle, dragged, }) {
    const [renaming, setRenaming] = useState(false);
    return (_jsxs("div", { className: cn('group flex items-center gap-1 rounded-lg p-1 pr-0.5', active ? 'bg-accent-soft' : 'hover:bg-muted', dragged && 'opacity-50'), children: [handle ? (_jsx("span", { ...handle, role: "button", "aria-label": `Drag to reorder ${card.name}`, className: "grid h-11 w-6 shrink-0 place-items-center text-muted-foreground", children: _jsx(GripVertical, { className: "size-3.5" }) })) : (_jsx("span", { className: "w-1" })), _jsxs("button", { type: "button", onClick: onPick, onDoubleClick: () => setRenaming(true), className: "flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left", children: [_jsxs("span", { className: "flex shrink-0 gap-1", children: [_jsx(LiveThumb, { card: card, side: "front", heightPx: 40 }), _jsx(LiveThumb, { card: card, side: "back", heightPx: 40, className: "opacity-80" })] }), !renaming && _jsx("span", { className: "truncate text-sm", children: card.name })] }), renaming && (_jsx(Input, { autoFocus: true, defaultValue: card.name, "aria-label": "Card name", onBlur: (e) => {
                    const v = e.target.value.trim();
                    if (v && v !== card.name)
                        renameCard(card.id, v);
                    setRenaming(false);
                }, onKeyDown: (e) => {
                    if (e.key === 'Enter')
                        e.currentTarget.blur();
                    if (e.key === 'Escape')
                        setRenaming(false);
                } })), _jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsx(IconButton, { label: `Options for ${card.name}`, size: "icon-sm", children: _jsx(MoreHorizontal, {}) }) }), _jsxs(DropdownMenuContent, { align: "end", children: [_jsx(DropdownMenuItem, { onSelect: () => setRenaming(true), children: "Rename" }), _jsxs(DropdownMenuItem, { onSelect: () => duplicateCard(card.id), children: [_jsx(Copy, {}), " Duplicate"] }), _jsx(DropdownMenuSeparator, {}), _jsxs(DropdownMenuItem, { danger: true, onSelect: () => deleteCard(card.id), children: [_jsx(Trash2, {}), " Delete"] })] })] })] }));
}
