import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useShallow } from 'zustand/react/shallow';
import { distributeSelection, groupSelection } from '@/core/editor/elementCommands';
import { useEditor } from '@/core/editor/editorStore';
import { setBleed, setSafe } from '@/core/editor/projectCommands';
import { isLayoutEditable, selectedElements } from '@/core/editor/selectors';
import { Button } from '@/ui/components/ui/button';
import { NumberField, Row, Section } from '@/ui/components/fields';
import { CardSizeControls } from './properties/CardSizeControls';
import { AlignButtons, GeometrySection } from './properties/GeometrySection';
import { ImageFieldSection, ImageSection } from './properties/ImageSection';
import { PartSection } from './properties/PartSection';
import { ShapeSection } from './properties/ShapeSection';
import { TextSection } from './properties/TextSection';
export function PropertiesPanel() {
    const els = useEditor(useShallow(selectedElements));
    const state = useEditor();
    if (!state.doc)
        return null;
    if (els.length === 0)
        return _jsx(DocumentProperties, {});
    if (els.length > 1) {
        const editable = els.every((e) => isLayoutEditable(state, e.id));
        return (_jsx("div", { children: _jsxs(Section, { title: `${els.length} selected`, children: [_jsx(AlignButtons, { disabled: !editable }), _jsxs(Row, { children: [_jsx(Button, { variant: "outline", size: "sm", disabled: !editable || els.length < 3, onClick: () => distributeSelection('x'), children: "Distribute \u2194" }), _jsx(Button, { variant: "outline", size: "sm", disabled: !editable || els.length < 3, onClick: () => distributeSelection('y'), children: "Distribute \u2195" })] }), _jsx(Button, { variant: "secondary", size: "sm", disabled: !editable, onClick: groupSelection, children: "Group selection" })] }) }));
    }
    const el = els[0];
    const editable = isLayoutEditable(state, el.id) && !el.editLocked;
    return (_jsxs("div", { children: [_jsxs("div", { className: "border-b px-4 py-3", children: [_jsx("div", { className: "truncate text-sm font-semibold", children: el.name }), _jsx("div", { className: "text-xs text-muted-foreground", children: typeLabel(el.type) })] }), _jsx(PartSection, { el: el }), el.type === 'text' && _jsx(TextSection, { el: el, editable: editable }), el.type === 'image' && _jsx(ImageSection, { el: el, editable: editable }), el.type === 'imageField' && _jsx(ImageFieldSection, { el: el }), el.type === 'shape' && _jsx(ShapeSection, { el: el, editable: editable }), _jsx(GeometrySection, { el: el, editable: editable })] }));
}
function typeLabel(t) {
    return {
        text: 'Text field',
        imageField: 'Image field',
        shape: 'Shape',
        image: 'Image',
        group: 'Group',
    }[t];
}
function DocumentProperties() {
    const project = useEditor((s) => s.doc.project);
    return (_jsxs("div", { children: [_jsx(Section, { title: "Card", children: _jsx(CardSizeControls, {}) }), _jsxs(Section, { title: "Print area", children: [_jsxs(Row, { children: [_jsx(NumberField, { label: "Bleed", unit: "mm", min: 0, max: 10, step: 0.5, value: project.bleedMm, onChange: setBleed }), _jsx(NumberField, { label: "Safe margin", unit: "mm", min: 0, max: 20, step: 0.5, value: project.safeMm, onChange: setSafe })] }), _jsx("p", { className: "text-xs text-muted-foreground", children: "Bleed is the extra artwork beyond the cut line (red). Keep text inside the safe area (green)." })] })] }));
}
