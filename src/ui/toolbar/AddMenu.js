import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Plus } from 'lucide-react';
import { useEditor } from '@/core/editor/editorStore';
import { ADD_ITEMS } from '@/ui/actions/addItems';
import { Button } from '@/ui/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from '@/ui/components/ui/dropdown';
export function AddMenu() {
    const mode = useEditor((s) => s.view.mode);
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenuTrigger, { asChild: true, children: _jsxs(Button, { size: "sm", children: [_jsx(Plus, {}), " Add"] }) }), _jsxs(DropdownMenuContent, { align: "start", children: [_jsx(DropdownMenuLabel, { children: mode === 'template' ? 'Add to template' : 'Add to this card only' }), ADD_ITEMS.slice(0, 3).map((i) => (_jsxs(DropdownMenuItem, { onSelect: () => i.run(), children: [_jsx(i.icon, {}), " ", i.label] }, i.id))), _jsx(DropdownMenuSeparator, {}), ADD_ITEMS.slice(3).map((i) => (_jsxs(DropdownMenuItem, { onSelect: () => i.run(), children: [_jsx(i.icon, {}), " ", i.label] }, i.id)))] })] }));
}
/** Grid version for the phone "Add" bottom sheet. */
export function AddGrid({ onDone }) {
    return (_jsx("div", { className: "grid grid-cols-3 gap-2 p-3", children: ADD_ITEMS.map((i) => (_jsxs("button", { type: "button", onClick: () => {
                i.run();
                onDone();
            }, className: "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border bg-panel text-xs font-medium hover:bg-muted", children: [_jsx(i.icon, { className: "size-5" }), i.label.replace(' (art box)', '')] }, i.id))) }));
}
