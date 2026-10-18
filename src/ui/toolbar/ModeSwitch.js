import { jsx as _jsx } from "react/jsx-runtime";
import { useEditor, setView } from '@/core/editor/editorStore';
import { activeTemplate, currentCard } from '@/core/editor/selectors';
import { cn } from '@/lib/cn';
/** Card mode fills in a card; template mode edits the layout shared by many cards. */
export function ModeSwitch({ className }) {
    const mode = useEditor((s) => s.view.mode);
    const toTemplate = () => {
        const s = useEditor.getState();
        const t = activeTemplate(s);
        const card = currentCard(s);
        const id = t?.id ??
            (card ? (s.view.side === 'front' ? card.frontTemplateId : card.backTemplateId) : null);
        setView({ mode: 'template', templateId: id, selection: [], editingTextId: null, cropId: null });
    };
    const toCard = () => setView({ mode: 'card', selection: [], editingTextId: null, cropId: null });
    return (_jsx("div", { role: "radiogroup", "aria-label": "Editing mode", className: cn('inline-flex rounded-lg bg-muted p-0.5', className), children: [
            ['card', 'Card', toCard],
            ['template', 'Template', toTemplate],
        ].map(([m, label, fn]) => (_jsx("button", { type: "button", role: "radio", "aria-checked": mode === m, onClick: fn, className: cn('h-10 rounded-md px-3 text-xs font-medium text-muted-foreground md:h-7', mode === m && 'bg-panel text-foreground shadow-sm', mode === m && m === 'template' && 'text-accent'), children: label }, m))) }));
}
