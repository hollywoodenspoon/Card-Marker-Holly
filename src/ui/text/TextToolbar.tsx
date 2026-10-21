import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import {
  AlignCenter,
  Braces,
  Paintbrush,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Underline,
} from '@/ui/icons'
import { useMemo } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { BUILTIN_FONTS } from '@/assets/fonts'
import { useEditor as useDocEditor } from '@/core/editor/editorStore'
import type { TextStyle } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
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
      <StyleMenu editor={editor} />
      <SymbolMenu editor={editor} />
    </div>
  )
}

/** Insert `{name}` for one of the project's symbol images. */
function SymbolMenu({ editor }: { editor: Editor }) {
  const assets = useDocEditor((s) => s.library.assets)
  const symbols = useMemo(
    () =>
      Object.values(assets)
        .filter((a) => a.tags[0])
        .sort((a, b) => a.tags[0].localeCompare(b.tags[0])),
    [assets],
  )
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label="Insert symbol" size="icon-sm" onMouseDown={(e) => e.preventDefault()}>
          <Braces />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>Insert symbol</DropdownMenuLabel>
        {symbols.map((a) => (
          <DropdownMenuItem
            key={a.id}
            onSelect={() => editor.chain().focus().insertContent(`{${a.tags[0]}}`).run()}
          >
            <img src={assetResolver.getUrl(a.id)} alt="" className="size-5 object-contain" />
            <span className="font-mono text-xs">{`{${a.tags[0]}}`}</span>
          </DropdownMenuItem>
        ))}
        {!symbols.length && (
          <p className="max-w-56 px-2.5 py-2 text-xs text-muted-foreground">
            No symbols yet. In Assets, choose “Symbol name…” on an image, then type {'{name}'} in
            text.
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Apply a shared style's look to the selected words (as per-character formatting). */
function StyleMenu({ editor }: { editor: Editor }) {
  const presets = useDocEditor((s) => s.doc?.stylePresets)
  const list = useMemo(
    () => Object.values(presets ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [presets],
  )
  if (!list.length) return null
  const apply = (style: Partial<TextStyle>) => {
    let c = editor.chain().focus()
    if (style.fontFamily) c = c.setFontFamily(style.fontFamily)
    if (style.sizePt) c = c.setFontSize(`${style.sizePt}pt`)
    if (style.color) c = c.setColor(style.color)
    if (style.letterSpacingEm !== undefined)
      c = c.setMark('textStyle', {
        letterSpacing: style.letterSpacingEm ? `${style.letterSpacingEm}em` : null,
      })
    if (style.bold !== undefined) c = style.bold ? c.setBold() : c.unsetBold()
    if (style.italic !== undefined) c = style.italic ? c.setItalic() : c.unsetItalic()
    if (style.underline !== undefined) c = style.underline ? c.setUnderline() : c.unsetUnderline()
    c.run()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          label="Apply a style to the selection"
          size="icon-sm"
          onMouseDown={(e) => e.preventDefault()}
        >
          <Paintbrush />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>Apply style to selection</DropdownMenuLabel>
        {list.map((p) => (
          <DropdownMenuItem key={p.id} onSelect={() => apply(p.style)}>
            <span
              style={{
                fontFamily: p.style.fontFamily ? `"${p.style.fontFamily}"` : undefined,
                fontWeight: p.style.bold ? 700 : 400,
                fontStyle: p.style.italic ? 'italic' : undefined,
                color: p.style.color,
              }}
            >
              {p.name}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
