import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEditorState } from '@tiptap/react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Italic, Underline, } from 'lucide-react';
import { useMemo } from 'react';
import { BUILTIN_FONTS } from '@/assets/fonts';
import { useEditor as useDocEditor } from '@/core/editor/editorStore';
import { cn } from '@/lib/cn';
import { IconButton } from '@/ui/components/ui/button';
import { normaliseColor } from './pmConvert';
/** Formatting for the current text selection (per-character styling). */
export function TextToolbar({ editor, base, className, }) {
    const uploaded = useDocEditor((s) => s.library.fonts);
    const families = useMemo(() => [...new Set([...Object.values(uploaded).map((f) => f.family), ...BUILTIN_FONTS])], [uploaded]);
    const st = useEditorState({
        editor,
        selector: ({ editor: e }) => {
            const ts = e.getAttributes('textStyle');
            const para = e.getAttributes('paragraph');
            return {
                bold: e.isActive('bold'),
                italic: e.isActive('italic'),
                underline: e.isActive('underline'),
                family: String(ts.fontFamily ?? base.fontFamily).replace(/^["']|["']$/g, ''),
                size: parseFloat(String(ts.fontSize ?? base.sizePt)) || base.sizePt,
                color: normaliseColor(String(ts.color ?? base.color)),
                spacing: parseFloat(String(ts.letterSpacing ?? 0)) || 0,
                align: para.textAlign ?? 'left',
                lineHeight: parseFloat(String(para.lineHeight ?? '')) || 1.2,
            };
        },
    });
    const chain = () => editor.chain().focus();
    const keep = (e) => e.preventDefault(); // keep text selection
    return (_jsxs("div", { className: cn('flex flex-wrap items-center gap-1 rounded-xl border bg-panel p-1 shadow-lg', className), onPointerDown: (e) => e.stopPropagation(), children: [_jsxs("select", { "aria-label": "Font", value: families.includes(st.family) ? st.family : '', onChange: (e) => chain().setFontFamily(e.target.value).run(), className: "h-11 max-w-36 rounded-md border border-input bg-panel px-1.5 text-sm md:h-8", children: [!families.includes(st.family) && _jsx("option", { value: "", children: st.family }), families.map((f) => (_jsx("option", { value: f, style: { fontFamily: `"${f}"` }, children: f }, f)))] }), _jsxs("label", { className: "flex h-11 items-center rounded-md border border-input bg-panel pr-1.5 md:h-8", children: [_jsx("input", { "aria-label": "Font size", type: "number", min: 2, max: 200, step: 0.5, value: Math.round(st.size * 10) / 10, onChange: (e) => {
                            const v = parseFloat(e.target.value);
                            if (v > 0)
                                editor.chain().setFontSize(`${v}pt`).run();
                        }, className: "h-full w-14 bg-transparent px-1.5 text-sm tabular-nums outline-none" }), _jsx("span", { className: "text-xs text-muted-foreground", children: "pt" })] }), _jsxs("label", { className: "relative grid size-11 place-items-center rounded-md border border-input md:size-8", title: "Text colour", children: [_jsx("span", { className: "size-5 rounded-sm border", style: { background: st.color } }), _jsx("input", { type: "color", "aria-label": "Text colour", value: /^#[0-9a-f]{6}$/i.test(st.color) ? st.color : '#000000', onChange: (e) => editor.chain().setColor(e.target.value).run(), className: "absolute inset-0 opacity-0" })] }), _jsx("span", { className: "mx-0.5 h-6 w-px bg-border" }), _jsx(IconButton, { label: "Bold", size: "icon-sm", active: st.bold, onMouseDown: keep, onClick: () => chain().toggleBold().run(), children: _jsx(Bold, {}) }), _jsx(IconButton, { label: "Italic", size: "icon-sm", active: st.italic, onMouseDown: keep, onClick: () => chain().toggleItalic().run(), children: _jsx(Italic, {}) }), _jsx(IconButton, { label: "Underline", size: "icon-sm", active: st.underline, onMouseDown: keep, onClick: () => chain().toggleUnderline().run(), children: _jsx(Underline, {}) }), _jsx("span", { className: "mx-0.5 h-6 w-px bg-border" }), [
                ['left', AlignLeft],
                ['center', AlignCenter],
                ['right', AlignRight],
                ['justify', AlignJustify],
            ].map(([a, Icon]) => (_jsx(IconButton, { label: `Align ${a}`, size: "icon-sm", active: st.align === a, onMouseDown: keep, onClick: () => chain().setTextAlign(a).run(), children: _jsx(Icon, {}) }, a))), _jsx("span", { className: "mx-0.5 h-6 w-px bg-border" }), _jsxs("label", { className: "flex h-11 items-center gap-1 rounded-md border border-input px-1.5 text-xs text-muted-foreground md:h-8", title: "Line height", children: ["\u2195", _jsx("input", { "aria-label": "Line height", type: "number", min: 0.5, max: 4, step: 0.05, value: st.lineHeight, onChange: (e) => {
                            const v = parseFloat(e.target.value);
                            if (v > 0)
                                chain()
                                    .updateAttributes('paragraph', { lineHeight: String(v) })
                                    .run();
                        }, className: "w-12 bg-transparent text-sm text-foreground tabular-nums outline-none" })] }), _jsxs("label", { className: "flex h-11 items-center gap-1 rounded-md border border-input px-1.5 text-xs text-muted-foreground md:h-8", title: "Letter spacing (em)", children: ["\u2194", _jsx("input", { "aria-label": "Letter spacing", type: "number", min: -0.2, max: 1, step: 0.01, value: st.spacing, onChange: (e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v))
                                editor
                                    .chain()
                                    .setMark('textStyle', { letterSpacing: v ? `${v}em` : null })
                                    .run();
                        }, className: "w-12 bg-transparent text-sm text-foreground tabular-nums outline-none" })] })] }));
}
