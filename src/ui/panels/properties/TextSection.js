import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, Bold, Italic, Pencil, Underline, } from 'lucide-react';
import { useMemo } from 'react';
import { BUILTIN_FONTS } from '@/assets/fonts';
import { setView, useEditor } from '@/core/editor/editorStore';
import { updateElement } from '@/core/editor/elementCommands';
import { clearRunStyleKeys } from '@/core/text/richtext';
import { hasCardValue, resetFieldValue } from '@/templates/fieldCommands';
import { Button, IconButton } from '@/ui/components/ui/button';
import { Label, NativeSelect } from '@/ui/components/ui/input';
import { Switch } from '@/ui/components/ui/switch';
import { ColorField, NumberField, Row, Section } from '@/ui/components/fields';
export function TextSection({ el, editable }) {
    const fonts = useEditor((s) => s.library.fonts);
    const mode = useEditor((s) => s.view.mode);
    const cardHasValue = useEditor(() => hasCardValue(el.id));
    const families = useMemo(() => [...new Set([...Object.values(fonts).map((f) => f.family), ...BUILTIN_FONTS])], [fonts]);
    const set = (fn, key) => updateElement(el.id, (d) => fn(d), `${key}:${el.id}`);
    /** Change the base style; runs in the default text that set this key follow it again. */
    const setStyle = (key, v) => set((e) => {
        e.baseStyle[key] = v;
        e.defaultText = clearRunStyleKeys(e.defaultText, [key]);
    }, 'style-' + key);
    const s = el.baseStyle;
    return (_jsxs(_Fragment, { children: [_jsxs(Section, { title: "Text", children: [_jsxs(Button, { size: "sm", onClick: () => setView({ editingTextId: el.id, selection: [el.id] }), children: [_jsx(Pencil, {}), " Edit text"] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Double-click (or double-tap) the text on the card to edit. Select words to style them individually." }), mode === 'card' && !editable && cardHasValue && (_jsx(Button, { variant: "ghost", size: "sm", onClick: () => resetFieldValue(el.id), children: "Use template default text" }))] }), _jsxs(Section, { title: "Default style", children: [!editable && (_jsx("p", { className: "text-xs text-muted-foreground", children: "Edit the template to change the layout and default style." })), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "tf-font", children: "Font" }), _jsxs(NativeSelect, { id: "tf-font", value: s.fontFamily, disabled: !editable, onChange: (e) => setStyle('fontFamily', e.target.value), children: [!families.includes(s.fontFamily) && (_jsxs("option", { value: s.fontFamily, children: [s.fontFamily, " (missing)"] })), families.map((f) => (_jsx("option", { value: f, children: f }, f)))] })] }), _jsxs(Row, { children: [_jsx(NumberField, { label: "Size", unit: "pt", min: 1, max: 200, step: 0.5, value: s.sizePt, disabled: !editable, onChange: (v) => setStyle('sizePt', v) }), _jsx(ColorField, { label: "Colour", value: s.color, disabled: !editable, onChange: (v) => v && setStyle('color', v) })] }), _jsxs("div", { className: "flex flex-wrap gap-1", children: [_jsx(IconButton, { label: "Bold", variant: "outline", size: "icon-sm", active: s.bold, disabled: !editable, onClick: () => setStyle('bold', !s.bold), children: _jsx(Bold, {}) }), _jsx(IconButton, { label: "Italic", variant: "outline", size: "icon-sm", active: s.italic, disabled: !editable, onClick: () => setStyle('italic', !s.italic), children: _jsx(Italic, {}) }), _jsx(IconButton, { label: "Underline", variant: "outline", size: "icon-sm", active: s.underline, disabled: !editable, onClick: () => setStyle('underline', !s.underline), children: _jsx(Underline, {}) }), _jsx("span", { className: "w-2" }), [
                                ['left', AlignLeft],
                                ['center', AlignCenter],
                                ['right', AlignRight],
                                ['justify', AlignJustify],
                            ].map(([a, Icon]) => (_jsx(IconButton, { label: `Align ${a}`, variant: "outline", size: "icon-sm", active: el.align === a, disabled: !editable, onClick: () => set((e) => void (e.align = a), 'align'), children: _jsx(Icon, {}) }, a)))] }), _jsx("div", { className: "flex gap-1", children: [
                            ['top', AlignVerticalJustifyStart, 'Top'],
                            ['middle', AlignVerticalJustifyCenter, 'Middle'],
                            ['bottom', AlignVerticalJustifyEnd, 'Bottom'],
                        ].map(([a, Icon, label]) => (_jsx(IconButton, { label: `Vertical align ${label}`, variant: "outline", size: "icon-sm", active: el.vAlign === a, disabled: !editable, onClick: () => set((e) => void (e.vAlign = a), 'valign'), children: _jsx(Icon, {}) }, a))) }), _jsxs(Row, { cols: 3, children: [_jsx(NumberField, { label: "Line height", min: 0.5, max: 4, step: 0.05, value: el.lineHeight, disabled: !editable, onChange: (v) => set((e) => void (e.lineHeight = v), 'lh') }), _jsx(NumberField, { label: "Spacing", unit: "em", min: -0.2, max: 1, step: 0.01, value: s.letterSpacingEm, disabled: !editable, onChange: (v) => setStyle('letterSpacingEm', v) }), _jsx(NumberField, { label: "Padding", unit: "mm", min: 0, max: 20, step: 0.5, value: el.paddingMm, disabled: !editable, onChange: (v) => set((e) => void (e.paddingMm = v), 'pad') })] })] }), _jsxs(Section, { title: "Auto-shrink", children: [_jsxs("label", { className: "flex items-center justify-between gap-3 text-sm", children: ["Shrink text to fit the box", _jsx(Switch, { checked: el.autoShrink.enabled, disabled: !editable, onCheckedChange: (v) => set((e) => void (e.autoShrink.enabled = v), 'shrink'), "aria-label": "Auto-shrink" })] }), el.autoShrink.enabled && (_jsx(NumberField, { label: "Smallest size", unit: "pt", min: 1, max: s.sizePt, step: 0.5, value: el.autoShrink.minPt, disabled: !editable, onChange: (v) => set((e) => void (e.autoShrink.minPt = v), 'minpt') })), _jsx("p", { className: "text-xs text-muted-foreground", children: "A red dashed box on the card means the text still doesn't fit." })] })] }));
}
