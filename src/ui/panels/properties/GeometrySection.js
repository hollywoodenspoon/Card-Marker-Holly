import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, ArrowDownToLine, ArrowUpToLine, ChevronDown, ChevronUp, FlipHorizontal2, FlipVertical2, } from 'lucide-react';
import { alignSelection, reorderElement, updateElement } from '@/core/editor/elementCommands';
import { IconButton } from '@/ui/components/ui/button';
import { NumberField, Row, Section } from '@/ui/components/fields';
import { Slider } from '@/ui/components/ui/slider';
import { Label } from '@/ui/components/ui/input';
export function AlignButtons({ disabled }) {
    const items = [
        ['left', AlignStartVertical, 'Align left'],
        ['hcenter', AlignCenterVertical, 'Align centre'],
        ['right', AlignEndVertical, 'Align right'],
        ['top', AlignStartHorizontal, 'Align top'],
        ['vcenter', AlignCenterHorizontal, 'Align middle'],
        ['bottom', AlignEndHorizontal, 'Align bottom'],
    ];
    return (_jsx("div", { className: "grid grid-cols-6 gap-0.5", children: items.map(([mode, Icon, label]) => (_jsx(IconButton, { label: label, size: "icon-sm", disabled: disabled, onClick: () => alignSelection(mode), children: _jsx(Icon, {}) }, mode))) }));
}
export function GeometrySection({ el, editable }) {
    const isGroup = el.type === 'group';
    const set = (fn, key) => updateElement(el.id, (d) => fn(d), `${key}:${el.id}`);
    return (_jsxs(Section, { title: "Layout", children: [_jsx(AlignButtons, { disabled: !editable }), !isGroup && (_jsxs(_Fragment, { children: [_jsxs(Row, { children: [_jsx(NumberField, { label: "X", unit: "mm", value: el.xMm, disabled: !editable, onChange: (v) => set((e) => void (e.xMm = v), 'x') }), _jsx(NumberField, { label: "Y", unit: "mm", value: el.yMm, disabled: !editable, onChange: (v) => set((e) => void (e.yMm = v), 'y') })] }), _jsxs(Row, { children: [_jsx(NumberField, { label: "Width", unit: "mm", min: 0.5, value: el.wMm, disabled: !editable, onChange: (v) => set((e) => void (e.wMm = v), 'w') }), _jsx(NumberField, { label: "Height", unit: "mm", min: 0.5, value: el.hMm, disabled: !editable, onChange: (v) => set((e) => void (e.hMm = v), 'h') })] }), _jsxs(Row, { children: [_jsx(NumberField, { label: "Rotation", unit: "\u00B0", step: 1, value: el.rotation, disabled: !editable, onChange: (v) => set((e) => void (e.rotation = ((v % 360) + 360) % 360), 'rot') }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { children: "Flip" }), _jsxs("div", { className: "flex gap-1", children: [_jsx(IconButton, { label: "Flip horizontally", variant: "outline", size: "icon-sm", active: el.flipX, disabled: !editable, onClick: () => set((e) => void (e.flipX = !e.flipX), 'fx'), children: _jsx(FlipHorizontal2, {}) }), _jsx(IconButton, { label: "Flip vertically", variant: "outline", size: "icon-sm", active: el.flipY, disabled: !editable, onClick: () => set((e) => void (e.flipY = !e.flipY), 'fy'), children: _jsx(FlipVertical2, {}) })] })] })] })] })), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs(Label, { children: ["Opacity \u00B7 ", Math.round(el.opacity * 100), "%"] }), _jsx(Slider, { "aria-label": "Opacity", min: 0, max: 100, step: 1, disabled: !editable, value: [Math.round(el.opacity * 100)], onValueChange: ([v]) => set((e) => void (e.opacity = v / 100), 'opacity') })] }), _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx(Label, { children: "Arrange" }), _jsxs("div", { className: "grid grid-cols-4 gap-0.5", children: [_jsx(IconButton, { label: "Bring to front", size: "icon-sm", disabled: !editable, onClick: () => reorderElement(el.id, 'front'), children: _jsx(ArrowUpToLine, {}) }), _jsx(IconButton, { label: "Bring forward", size: "icon-sm", disabled: !editable, onClick: () => reorderElement(el.id, 'forward'), children: _jsx(ChevronUp, {}) }), _jsx(IconButton, { label: "Send backward", size: "icon-sm", disabled: !editable, onClick: () => reorderElement(el.id, 'backward'), children: _jsx(ChevronDown, {}) }), _jsx(IconButton, { label: "Send to back", size: "icon-sm", disabled: !editable, onClick: () => reorderElement(el.id, 'back'), children: _jsx(ArrowDownToLine, {}) })] })] })] }));
}
