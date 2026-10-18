import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { Label } from './ui/input';
/**
 * Numeric input that commits as you type (valid numbers only) and on blur.
 * Arrow keys step by `step` (×10 with Shift).
 */
export function NumberField({ label, value, onChange, unit, step = 0.1, min, max, precision = 2, disabled, className, id, }) {
    const shown = formatNum(value, precision);
    // null while not focused, so the field follows external changes.
    const [draft, setDraft] = useState(null);
    const clampV = (v) => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v));
    const inputId = id ?? `nf-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (_jsxs("div", { className: cn('flex min-w-0 flex-col gap-1', className), children: [_jsx(Label, { htmlFor: inputId, children: label }), _jsxs("div", { className: "flex h-11 items-center rounded-md border border-input bg-panel focus-within:border-accent md:h-8", children: [_jsx("input", { id: inputId, inputMode: "decimal", disabled: disabled, value: draft ?? shown, onFocus: (e) => {
                            setDraft(shown);
                            e.currentTarget.select();
                        }, onChange: (e) => {
                            setDraft(e.target.value);
                            const v = parseFloat(e.target.value.replace(',', '.'));
                            if (Number.isFinite(v))
                                onChange(clampV(v));
                        }, onBlur: () => setDraft(null), onKeyDown: (e) => {
                            if (e.key === 'Enter')
                                e.currentTarget.blur();
                            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                e.preventDefault();
                                const d = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
                                const v = clampV(round(value + d, precision));
                                onChange(v);
                                setDraft(formatNum(v, precision));
                            }
                        }, className: "h-full w-full min-w-0 bg-transparent px-2 text-base tabular-nums outline-none disabled:opacity-50 md:text-sm" }), unit && _jsx("span", { className: "pr-2 text-xs text-muted-foreground", children: unit })] })] }));
}
const round = (v, p) => Math.round(v * 10 ** p) / 10 ** p;
const formatNum = (v, p) => String(round(v, p));
/** Colour swatch + hex input; `allowNone` adds a "no colour" toggle. */
export function ColorField({ label, value, onChange, allowNone, disabled, }) {
    const [draft, setDraft] = useState(null);
    const id = `cf-${label.replace(/\s+/g, '-').toLowerCase()}`;
    return (_jsxs("div", { className: "flex min-w-0 flex-col gap-1", children: [_jsx(Label, { htmlFor: id, children: label }), _jsxs("div", { className: "flex h-11 items-center gap-1.5 rounded-md border border-input bg-panel px-1.5 md:h-8", children: [_jsx("label", { className: "relative size-8 shrink-0 cursor-pointer overflow-hidden rounded border md:size-5", style: {
                            background: value ?? 'repeating-conic-gradient(#ccc 0 25%, #fff 0 50%) 50% / 8px 8px',
                        }, children: _jsx("input", { type: "color", "aria-label": `${label} picker`, disabled: disabled, value: value ?? '#ffffff', onChange: (e) => onChange(e.target.value), className: "absolute inset-0 cursor-pointer opacity-0" }) }), _jsx("input", { id: id, disabled: disabled, value: draft ?? value ?? 'none', onFocus: (e) => {
                            setDraft(value ?? '');
                            e.currentTarget.select();
                        }, onChange: (e) => {
                            setDraft(e.target.value);
                            const v = normaliseHex(e.target.value);
                            if (v)
                                onChange(v);
                        }, onBlur: () => setDraft(null), className: "h-full min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none md:text-xs" }), allowNone && (_jsx("button", { type: "button", disabled: disabled, onClick: () => onChange(value ? null : '#000000'), className: "h-9 shrink-0 rounded px-1.5 text-xs text-muted-foreground hover:bg-muted md:h-6", children: value ? 'None' : 'Add' }))] })] }));
}
function normaliseHex(v) {
    const s = v.trim().replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(s))
        return '#' + s.toLowerCase();
    if (/^[0-9a-f]{3}$/i.test(s))
        return ('#' +
            s
                .split('')
                .map((c) => c + c)
                .join('')
                .toLowerCase());
    return null;
}
export function Section({ title, children, action, }) {
    return (_jsxs("section", { className: "border-b px-4 py-3 last:border-b-0", children: [_jsxs("div", { className: "mb-2.5 flex items-center justify-between gap-2", children: [_jsx("h3", { className: "text-xs font-semibold tracking-wide text-muted-foreground uppercase", children: title }), action] }), _jsx("div", { className: "flex flex-col gap-3", children: children })] }));
}
export function Row({ children, cols = 2 }) {
    return (_jsx("div", { className: cn('grid gap-2', cols === 2 && 'grid-cols-2', cols === 3 && 'grid-cols-3', cols === 4 && 'grid-cols-4'), children: children }));
}
