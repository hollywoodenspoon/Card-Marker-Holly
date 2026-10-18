import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { useEditor } from '@/core/editor/editorStore';
import { setCardSize } from '@/core/editor/projectCommands';
import { matchPreset, orientationOf, presetSize, SIZE_PRESETS, withOrientation, } from '@/core/units/presets';
import { IconButton } from '@/ui/components/ui/button';
import { Label, NativeSelect } from '@/ui/components/ui/input';
import { NumberField, Row } from '@/ui/components/fields';
export function CardSizeControls() {
    const size = useEditor((s) => s.doc?.project.defaultSize);
    if (!size)
        return null;
    const preset = matchPreset(size.widthMm, size.heightMm);
    const orient = orientationOf(size);
    return (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { htmlFor: "size-preset", children: "Card size" }), _jsxs("div", { className: "flex gap-1.5", children: [_jsxs(NativeSelect, { id: "size-preset", value: preset, onChange: (e) => {
                                    if (e.target.value === 'custom')
                                        return setCardSize({ ...size, presetId: 'custom' });
                                    setCardSize(withOrientation(presetSize(e.target.value), orient));
                                }, children: [SIZE_PRESETS.map((p) => (_jsxs("option", { value: p.id, children: [p.label, " (", p.widthMm, " \u00D7 ", p.heightMm, ")"] }, p.id))), _jsx("option", { value: "custom", children: "Custom" })] }), _jsx(IconButton, { label: "Portrait", variant: "outline", size: "icon-sm", active: orient === 'portrait', onClick: () => setCardSize(withOrientation(size, 'portrait')), children: _jsx(RectangleVertical, {}) }), _jsx(IconButton, { label: "Landscape", variant: "outline", size: "icon-sm", active: orient === 'landscape', onClick: () => setCardSize(withOrientation(size, 'landscape')), children: _jsx(RectangleHorizontal, {}) })] })] }), _jsxs(Row, { children: [_jsx(NumberField, { label: "Width", unit: "mm", min: 10, max: 300, value: size.widthMm, onChange: (v) => setCardSize({ ...size, widthMm: v, presetId: matchPreset(v, size.heightMm) }, 'size') }), _jsx(NumberField, { label: "Height", unit: "mm", min: 10, max: 300, value: size.heightMm, onChange: (v) => setCardSize({ ...size, heightMm: v, presetId: matchPreset(size.widthMm, v) }, 'size') })] })] }));
}
