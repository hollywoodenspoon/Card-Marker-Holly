import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft } from 'lucide-react';
import { setView, useEditor } from '@/core/editor/editorStore';
import { activeTemplate, currentCard } from '@/core/editor/selectors';
import { cn } from '@/lib/cn';
import { cardsUsingTemplate } from '@/templates/fields';
import { Button } from '@/ui/components/ui/button';
import { ModeSwitch } from '@/ui/toolbar/ModeSwitch';
/** Floating header over the canvas: front/back switch and what is being edited. */
export function CanvasHeader({ phone }) {
    const mode = useEditor((s) => s.view.mode);
    const side = useEditor((s) => s.view.side);
    const template = useEditor(activeTemplate);
    const card = useEditor(currentCard);
    const uses = useEditor((s) => s.doc && template ? cardsUsingTemplate(Object.values(s.doc.cards), template.id).length : 0);
    return (_jsxs("div", { className: "pointer-events-none absolute inset-x-0 top-7 z-10 flex flex-col items-center gap-2 px-3", children: [_jsxs("div", { className: "pointer-events-auto flex items-center gap-2", children: [phone && _jsx(ModeSwitch, { className: "shadow-md" }), mode === 'card' && _jsx(SideSwitch, { side: side, disabled: !card })] }), mode === 'template' && template && (_jsxs("div", { className: "pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-accent/40 bg-panel/95 py-1 pr-1 pl-3 text-xs shadow-md backdrop-blur", children: [_jsxs("span", { className: "truncate", children: ["Editing template ", _jsx("b", { children: template.name }), " (", template.side, ") \u00B7 ", uses, " card", uses === 1 ? '' : 's'] }), _jsxs(Button, { size: "sm", className: "h-9 rounded-full md:h-7", onClick: () => setView({ mode: 'card', selection: [], editingTextId: null, cropId: null }), children: [_jsx(ArrowLeft, {}), " Back to card"] })] }))] }));
}
function SideSwitch({ side, disabled }) {
    return (_jsx("div", { role: "radiogroup", "aria-label": "Card side", className: "inline-flex rounded-lg border bg-panel/95 p-0.5 shadow-md backdrop-blur", children: ['front', 'back'].map((s) => (_jsx("button", { type: "button", role: "radio", "aria-checked": side === s, disabled: disabled, onClick: () => setView({ side: s, selection: [], editingTextId: null, cropId: null }), className: cn('h-10 rounded-md px-3 text-xs font-medium text-muted-foreground capitalize md:h-7', side === s && 'bg-accent text-accent-foreground'), children: s }, s))) }));
}
