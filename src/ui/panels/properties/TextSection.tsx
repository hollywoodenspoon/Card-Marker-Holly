import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  Italic,
  Pencil,
  Underline,
} from 'lucide-react'
import { useMemo } from 'react'
import { BUILTIN_FONTS } from '@/assets/fonts'
import { setView, useEditor } from '@/core/editor/editorStore'
import { updateElement } from '@/core/editor/elementCommands'
import type { TextElement, TextStyle } from '@/core/model/types'
import { clearRunStyleKeys } from '@/core/text/richtext'
import { hasCardValue, resetFieldValue } from '@/templates/fieldCommands'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { Switch } from '@/ui/components/ui/switch'
import { ColorField, NumberField, Row, Section } from '@/ui/components/fields'

export function TextSection({ el, editable }: { el: TextElement; editable: boolean }) {
  const fonts = useEditor((s) => s.library.fonts)
  const mode = useEditor((s) => s.view.mode)
  const cardHasValue = useEditor(() => hasCardValue(el.id))
  const families = useMemo(
    () => [...new Set([...Object.values(fonts).map((f) => f.family), ...BUILTIN_FONTS])],
    [fonts],
  )
  const set = (fn: (e: TextElement) => void, key: string) =>
    updateElement(el.id, (d) => fn(d as TextElement), `${key}:${el.id}`)
  /** Change the base style; runs in the default text that set this key follow it again. */
  const setStyle = <K extends keyof TextStyle>(key: K, v: TextStyle[K]) =>
    set((e) => {
      e.baseStyle[key] = v
      e.defaultText = clearRunStyleKeys(e.defaultText, [key])
    }, 'style-' + key)
  const s = el.baseStyle

  return (
    <>
      <Section title="Text">
        <Button size="sm" onClick={() => setView({ editingTextId: el.id, selection: [el.id] })}>
          <Pencil /> Edit text
        </Button>
        <p className="text-xs text-muted-foreground">
          Double-click (or double-tap) the text on the card to edit. Select words to style them
          individually.
        </p>
        {mode === 'card' && !editable && cardHasValue && (
          <Button variant="ghost" size="sm" onClick={() => resetFieldValue(el.id)}>
            Use template default text
          </Button>
        )}
      </Section>
      <Section title="Default style">
        {!editable && (
          <p className="text-xs text-muted-foreground">
            Edit the template to change the layout and default style.
          </p>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="tf-font">Font</Label>
          <NativeSelect
            id="tf-font"
            value={s.fontFamily}
            disabled={!editable}
            onChange={(e) => setStyle('fontFamily', e.target.value)}
          >
            {!families.includes(s.fontFamily) && (
              <option value={s.fontFamily}>{s.fontFamily} (missing)</option>
            )}
            {families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Row>
          <NumberField
            label="Size"
            unit="pt"
            min={1}
            max={200}
            step={0.5}
            value={s.sizePt}
            disabled={!editable}
            onChange={(v) => setStyle('sizePt', v)}
          />
          <ColorField
            label="Colour"
            value={s.color}
            disabled={!editable}
            onChange={(v) => v && setStyle('color', v)}
          />
        </Row>
        <div className="flex flex-wrap gap-1">
          <IconButton
            label="Bold"
            variant="outline"
            size="icon-sm"
            active={s.bold}
            disabled={!editable}
            onClick={() => setStyle('bold', !s.bold)}
          >
            <Bold />
          </IconButton>
          <IconButton
            label="Italic"
            variant="outline"
            size="icon-sm"
            active={s.italic}
            disabled={!editable}
            onClick={() => setStyle('italic', !s.italic)}
          >
            <Italic />
          </IconButton>
          <IconButton
            label="Underline"
            variant="outline"
            size="icon-sm"
            active={s.underline}
            disabled={!editable}
            onClick={() => setStyle('underline', !s.underline)}
          >
            <Underline />
          </IconButton>
          <span className="w-2" />
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
              variant="outline"
              size="icon-sm"
              active={el.align === a}
              disabled={!editable}
              onClick={() => set((e) => void (e.align = a), 'align')}
            >
              <Icon />
            </IconButton>
          ))}
        </div>
        <div className="flex gap-1">
          {(
            [
              ['top', AlignVerticalJustifyStart, 'Top'],
              ['middle', AlignVerticalJustifyCenter, 'Middle'],
              ['bottom', AlignVerticalJustifyEnd, 'Bottom'],
            ] as const
          ).map(([a, Icon, label]) => (
            <IconButton
              key={a}
              label={`Vertical align ${label}`}
              variant="outline"
              size="icon-sm"
              active={el.vAlign === a}
              disabled={!editable}
              onClick={() => set((e) => void (e.vAlign = a), 'valign')}
            >
              <Icon />
            </IconButton>
          ))}
        </div>
        <Row cols={3}>
          <NumberField
            label="Line height"
            min={0.5}
            max={4}
            step={0.05}
            value={el.lineHeight}
            disabled={!editable}
            onChange={(v) => set((e) => void (e.lineHeight = v), 'lh')}
          />
          <NumberField
            label="Spacing"
            unit="em"
            min={-0.2}
            max={1}
            step={0.01}
            value={s.letterSpacingEm}
            disabled={!editable}
            onChange={(v) => setStyle('letterSpacingEm', v)}
          />
          <NumberField
            label="Padding"
            unit="mm"
            min={0}
            max={20}
            step={0.5}
            value={el.paddingMm}
            disabled={!editable}
            onChange={(v) => set((e) => void (e.paddingMm = v), 'pad')}
          />
        </Row>
      </Section>
      <Section title="Auto-shrink">
        <label className="flex items-center justify-between gap-3 text-sm">
          Shrink text to fit the box
          <Switch
            checked={el.autoShrink.enabled}
            disabled={!editable}
            onCheckedChange={(v) => set((e) => void (e.autoShrink.enabled = v), 'shrink')}
            aria-label="Auto-shrink"
          />
        </label>
        {el.autoShrink.enabled && (
          <NumberField
            label="Smallest size"
            unit="pt"
            min={1}
            max={s.sizePt}
            step={0.5}
            value={el.autoShrink.minPt}
            disabled={!editable}
            onChange={(v) => set((e) => void (e.autoShrink.minPt = v), 'minpt')}
          />
        )}
        <p className="text-xs text-muted-foreground">
          A red dashed box on the card means the text still doesn't fit.
        </p>
      </Section>
    </>
  )
}
