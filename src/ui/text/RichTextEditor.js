import { jsx as _jsx } from "react/jsx-runtime";
import { EditorContent, useEditor as useTiptap } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { currentTextContent, setTextContent } from '@/templates/fieldCommands';
import { editorExtensions } from './extensions';
import { fromPM, toPM } from './pmConvert';
import { TextToolbar } from './TextToolbar';
/**
 * Rich text editing for one text element. Rendered in real CSS mm/pt so the
 * caller can scale it with a CSS transform to match the canvas.
 */
export function RichTextEditor({ el, onDone, children, contentScale = 1, toolbarClassName, }) {
    const elRef = useRef(el);
    useEffect(() => {
        elRef.current = el;
    });
    const editor = useTiptap({
        extensions: editorExtensions,
        content: toPM(currentTextContent(el.id) ?? { paragraphs: [] }, el.baseStyle, el.align, el.lineHeight),
        autofocus: 'end',
        immediatelyRender: true,
        editorProps: {
            attributes: { class: 'outline-none', spellcheck: 'false', 'aria-label': `Edit ${el.name}` },
            handleKeyDown: (_v, e) => {
                if (e.key === 'Escape') {
                    onDone();
                    return true;
                }
                return false;
            },
        },
        onUpdate: ({ editor: ed }) => {
            const cur = elRef.current;
            setTextContent(cur.id, fromPM(ed.getJSON(), cur.baseStyle, cur.align, cur.lineHeight), 'text:' + cur.id);
        },
    });
    if (!editor)
        return null;
    const s = contentScale;
    return children(_jsx(TextToolbar, { editor: editor, base: el.baseStyle, className: toolbarClassName }), _jsx("div", { className: "cm-text-editor", style: {
            width: `${(el.wMm - 2 * el.paddingMm) / s}mm`,
            transform: `scale(${s})`,
            transformOrigin: 'top left',
            color: el.baseStyle.color,
            fontFamily: `"${el.baseStyle.fontFamily}"`,
            fontSize: `${el.baseStyle.sizePt}pt`,
            lineHeight: el.lineHeight,
            textAlign: el.align,
        }, children: _jsx(EditorContent, { editor: editor }) }));
}
