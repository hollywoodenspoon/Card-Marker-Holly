import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from 'lucide-react'
import { useMemo } from 'react'
import { BUILTIN_FONTS } from '@/assets/fonts'
import { useEditor as useDocEditor } from '@/core/editor/editorStore'
import type { TextStyle } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/components/ui/button'
import { normaliseColor } from './pmConvert'

/** Formatting for the current text selection (per-character styling). */
export function TextToolbar({
  editor,
  base,
  className,
}: {
  editor: Editor
  base: TextStyle
  className?: string
}) {
  const uploaded = useDocEditor((s) => s.library.fonts)
  const families = useMemo(
    () => [...new Set([...Object.values(uploaded).map((f) => f.family), ...BUILTIN_FONTS])],
    [uploaded],
  )
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const ts = e.getAttributes('textStyle')
      const para = e.getAttributes('paragraph')
      return {
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        family: String(ts.fontFamily ?? base.fontFamily).replace(/^["']|["']$/g, ''),
        size: parseFloat(String(ts.fontSize ?? base.sizePt)) || base.sizePt,
        color: normaliseColor(String(ts.color ?? base.color)),
        spacing: parseFloat(String(ts.letterSpacing ?? 0)) || 0,
        align: (para.textAlign as string) ?? 'left',
        lineHeight: parseFloat(String(para.lineHeight ?? '')) || 1.2,
      }
    },
  })
  const chain = () => editor.chain().focus()
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault() // keep text selection

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-xl border bg-panel p-1 shadow-lg',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        aria-label="Font"
        value={families.includes(st.family) ? st.family : ''}
        onChange={(e) => chain().setFontFamily(e.target.value).run()}
        className="h-11 max-w-36 rounded-md border border-input bg-panel px-1.5 text-sm md:h-8"
      >
        {!families.includes(st.family) && <option value="">{st.family}</option>}
        {families.map((f) => (
          <option key={f} value={f} style={{ fontFamily: `"${f}"` }}>
            {f}
          </option>
        ))}
      </select>
      <label className="flex h-11 items-center rounded-md border border-input bg-panel pr-1.5 md:h-8">
        <input
          aria-label="Font size"
          type="number"
          min={2}
          max={200}
          step={0.5}
          value={Math.round(st.size * 10) / 10}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (v > 0) editor.chain().setFontSize(`${v}pt`).run()
          }}
          className="h-full w-14 bg-transparent px-1.5 text-sm tabular-nums outline-none"
        />
        <span className="text-xs text-muted-foreground">pt</span>
      </label>
      <label
        className="relative grid size-11 place-items-center rounded-md border border-input md:size-8"
        title="Text colour"
      >
        <span className="size-5 rounded-sm border" style={{ background: st.color }} />
        <input
          type="color"
          aria-label="Text colour"
          value={/^#[0-9a-f]{6}$/i.test(st.color) ? st.color : '#000000'}
          onChange={(e) => editor.chain().setColor(e.target.value).run()}
          className="absolute inset-0 opacity-0"
        />
      </label>
      <span className="mx-0.5 h-6 w-px bg-border" />
      <IconButton
        label="Bold"
        size="icon-sm"
        active={st.bold}
        onMouseDown={keep}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold />
      </IconButton>
      <IconButton
        label="Italic"
        size="icon-sm"
        active={st.italic}
        onMouseDown={keep}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic />
      </IconButton>
      <IconButton
        label="Underline"
        size="icon-sm"
        active={st.underline}
        onMouseDown={keep}
        onClick={() => chain().toggleUnderline().run()}
      >
        <Underline />
      </IconButton>
      <span className="mx-0.5 h-6 w-px bg-border" />
      {(
        [
          ['left', AlignLeft],
          ['center', AlignCenter],
          ['right', AlignRight],
          ['justify', AlignJustify],
        ] as const
      ).map(([a, Icon]) => (
        <IconButton
          key={a}
          label={`Align ${a}`}
          size="icon-sm"
          active={st.align === a}
          onMouseDown={keep}
          onClick={() => chain().setTextAlign(a).run()}
        >
          <Icon />
        </IconButton>
      ))}
      <span className="mx-0.5 h-6 w-px bg-border" />
      <label
        className="flex h-11 items-center gap-1 rounded-md border border-input px-1.5 text-xs text-muted-foreground md:h-8"
        title="Line height"
      >
        ↕
        <input
          aria-label="Line height"
          type="number"
          min={0.5}
          max={4}
          step={0.05}
          value={st.lineHeight}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (v > 0)
              chain()
                .updateAttributes('paragraph', { lineHeight: String(v) })
                .run()
          }}
          className="w-12 bg-transparent text-sm text-foreground tabular-nums outline-none"
        />
      </label>
      <label
        className="flex h-11 items-center gap-1 rounded-md border border-input px-1.5 text-xs text-muted-foreground md:h-8"
        title="Letter spacing (em)"
      >
        ↔
        <input
          aria-label="Letter spacing"
          type="number"
          min={-0.2}
          max={1}
          step={0.01}
          value={st.spacing}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (Number.isFinite(v))
              editor
                .chain()
                .setMark('textStyle', { letterSpacing: v ? `${v}em` : null })
                .run()
          }}
          className="w-12 bg-transparent text-sm text-foreground tabular-nums outline-none"
        />
      </label>
    </div>
  )
}
