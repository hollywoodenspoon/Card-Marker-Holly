import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LayoutTemplate } from 'lucide-react';
import { useState } from 'react';
import { useEditor } from '@/core/editor/editorStore';
import { updateElement } from '@/core/editor/elementCommands';
import { activeTemplate, currentCard, ownerOf } from '@/core/editor/selectors';
import { editTemplate, renameField, toggleVisibility } from '@/templates/commands';
import { isField, sharedFieldNames } from '@/templates/fields';
import { isVisibleOnCard } from '@/templates/resolve';
import { Button } from '@/ui/components/ui/button';
import { Input, Label } from '@/ui/components/ui/input';
import { Switch } from '@/ui/components/ui/switch';
import { Section } from '@/ui/components/fields';
/** How this element behaves as a template part: field name, default visibility, per-card toggling. */
export function PartSection({ el }) {
    const mode = useEditor((s) => s.view.mode);
    const owner = useEditor((s) => ownerOf(s, el.id));
    const template = useEditor(activeTemplate);
    const card = useEditor(currentCard);
    if (mode === 'card' && owner === 'template') {
        const visible = isVisibleOnCard(el, card);
        return (_jsxs(Section, { title: "Template part", children: [_jsxs("label", { className: "flex items-center justify-between gap-3 text-sm", children: ["Show on this card", _jsx(Switch, { checked: visible, disabled: el.toggleLocked, onCheckedChange: () => toggleVisibility(el.id), "aria-label": "Show on this card" })] }), el.toggleLocked && (_jsx("p", { className: "text-xs text-muted-foreground", children: "This part is always shown." })), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Position and style come from the template \u201C", template?.name, "\u201D."] }), template && (_jsxs(Button, { variant: "outline", size: "sm", onClick: () => editTemplate(template.id), children: [_jsx(LayoutTemplate, {}), " Edit template"] }))] }));
    }
    if (owner !== 'template')
        return null;
    return (_jsxs(Section, { title: "Template part", children: [isField(el) && template && (_jsx(FieldNameInput, { el: el, shared: sharedFieldNames(template, el).length }, el.id + el.fieldName)), _jsxs("label", { className: "flex items-center justify-between gap-3 text-sm", children: ["Shown by default", _jsx(Switch, { checked: el.defaultVisible, onCheckedChange: (v) => updateElement(el.id, (e) => void (e.defaultVisible = v)), "aria-label": "Shown by default" })] }), _jsxs("label", { className: "flex items-center justify-between gap-3 text-sm", children: ["Can be hidden per card", _jsx(Switch, { checked: !el.toggleLocked, onCheckedChange: (v) => updateElement(el.id, (e) => void (e.toggleLocked = !v)), "aria-label": "Can be hidden per card" })] })] }));
}
function FieldNameInput({ el, shared }) {
    const [v, setV] = useState(el.fieldName);
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "field-name", children: "Field name" }), _jsx(Input, { id: "field-name", value: v, onChange: (e) => setV(e.target.value), onBlur: () => (v.trim() ? renameField(el.id, v.trim()) : setV(el.fieldName)), onKeyDown: (e) => e.key === 'Enter' && e.currentTarget.blur() }), _jsxs("p", { className: "text-xs text-muted-foreground", children: ["Cards store their value under this name, so it carries over when a card switches to another template with the same field.", shared > 0 &&
                        ` ${shared} other part${shared > 1 ? 's' : ''} here use${shared > 1 ? '' : 's'} the same name and show the same value.`] })] }));
}
