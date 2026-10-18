import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Check } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { setView, useEditor } from '@/core/editor/editorStore';
import { findSurfaceElement } from '@/core/editor/selectors';
import { useTextLayout } from '@/core/render/textDraw';
import { pxPerMm, useViewport } from '@/core/render/viewport';
import { CSS_PX_PER_MM } from '@/core/units/units';
import { Button } from '@/ui/components/ui/button';
import { useTextValue } from '@/ui/panels/properties/useFieldValues';
import { useRenderVersion } from './useRenderVersion';
const done = () => setView({ editingTextId: null });
// The editor (Tiptap/ProseMirror) loads only when text editing starts.
const RichTextEditor = lazy(() => import('@/ui/text/RichTextEditor').then((m) => ({ default: m.RichTextEditor })));
/** In-place text editing over the canvas (desktop/tablet) or in a panel (phone). */
export function TextEditOverlay({ phone }) {
    const id = useEditor((s) => s.view.editingTextId);
    const el = useEditor((s) => (id ? findSurfaceElement(s, id) : undefined));
    if (!id || el?.type !== 'text')
        return null;
    return (_jsx(Suspense, { fallback: null, children: _jsx(Overlay, { el: el, phone: phone }, id) }));
}
/** The element's box in real CSS mm, scaled by `scale`. */
function TextBox({ el, scale, children, }) {
    const justify = el.vAlign === 'middle' ? 'center' : el.vAlign === 'bottom' ? 'flex-end' : 'flex-start';
    return (_jsx("div", { style: {
            width: `${el.wMm}mm`,
            height: `${el.hMm}mm`,
            padding: `${el.paddingMm}mm`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: justify,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
        }, children: children }));
}
function Overlay({ el, phone }) {
    const { zoom, panX, panY } = useViewport();
    const text = useTextValue(el.id);
    const version = useRenderVersion();
    const layout = useTextLayout(el, { kind: 'text', text: text ?? { paragraphs: [] } }, version);
    const k = pxPerMm(zoom);
    const stop = (e) => e.stopPropagation();
    if (phone) {
        // A panel at the top: comfortable size to type, the canvas below shows the result live.
        const panelScale = Math.min(3, (window.innerWidth - 24) / (el.wMm * CSS_PX_PER_MM));
        return (_jsx(RichTextEditor, { el: el, onDone: done, contentScale: layout.scale, children: (toolbar, content) => (_jsxs("div", { className: "absolute inset-x-0 top-0 z-20 flex flex-col gap-2 border-b bg-panel p-3 shadow-lg", onPointerDown: stop, children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx("div", { className: "min-w-0 flex-1 overflow-x-auto", children: toolbar }), _jsxs(Button, { size: "sm", onClick: done, children: [_jsx(Check, {}), " Done"] })] }), _jsx("div", { className: "overflow-auto rounded-lg border bg-white", style: { height: el.hMm * CSS_PX_PER_MM * panelScale + 2, maxHeight: '35dvh' }, children: _jsx(TextBox, { el: el, scale: panelScale, children: content }) })] })) }));
    }
    return (_jsx(RichTextEditor, { el: el, onDone: done, contentScale: layout.scale, children: (toolbar, content) => (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute top-8 left-1/2 z-20 -translate-x-1/2", onPointerDown: stop, children: toolbar }), _jsx("div", { className: "absolute z-10 outline-2 outline-accent outline-solid", style: {
                        left: panX + el.xMm * k,
                        top: panY + el.yMm * k,
                        width: el.wMm * k,
                        height: el.hMm * k,
                        transform: `rotate(${el.rotation}deg)`,
                        transformOrigin: 'top left',
                    }, onPointerDown: stop, children: _jsx(TextBox, { el: el, scale: zoom, children: content }) })] })) }));
}
