import {
  Highlighter,
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
  Plus,
  Underline,
} from 'lucide-react'
import { useMemo } from 'react'
import { setView, useEditor } from '@/core/editor/editorStore'
import { updateElement } from '@/core/editor/elementCommands'
import type { TextElement, TextStyle } from '@/core/model/types'
import { clearRunStyleKeys } from '@/core/text/richtext'
import { hasCardValue, resetFieldValue } from '@/templates/fieldCommands'
import { effectiveText } from '@/templates/resolve'
import {
  createStyleFromText,
  deleteStyle,
  linkStyle,
  presetUsage,
  renameStyle,
  updateStyle,
} from '@/templates/stylePresets'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { Switch } from '@/ui/components/ui/switch'
import { ColorField, NumberField, Row, Section } from '@/ui/components/fields'
import { useFontFamilies } from '@/ui/text/useFontFamilies'
import { useUi } from '@/ui/uiStore'
import { askConfirm, askText } from '@/ui/components/feedback'

export function TextSection({ el, editable }: { el: TextElement; editable: boolean }) {
  const mode = useEditor((s) => s.view.mode)
  const cardHasValue = useEditor(() => hasCardValue(el.id))
  const families = useFontFamilies()
  const set = (fn: (e: TextElement) => void, key: string) =>
    updateElement(el.id, (d) => fn(d as TextElement), `${key}:${el.id}`)
  /** Change the base style; runs in the default text that set this key follow it again. */
  const presets = useEditor((s) => s.doc?.stylePresets)
  const preset = el.stylePresetId ? presets?.[el.stylePresetId] : undefined
  /** Linked texts edit the shared style; others their own base style. */
  const setStyle = <K extends keyof TextStyle>(key: K, v: TextStyle[K]) =>
    preset
      ? updateStyle(preset.id, { [key]: v } as Partial<TextStyle>, `preset-${key}:${preset.id}`)
      : setOwnStyle(key, v)
  const setOwnStyle = <K extends keyof TextStyle>(key: K, v: TextStyle[K]) =>
    set((e) => {
      e.baseStyle[key] = v
      e.defaultText = clearRunStyleKeys(e.defaultText, [key])
    }, 'style-' + key)
  const s = effectiveText(el, presets).baseStyle

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
        <SymbolHint />
        {mode === 'card' && !editable && cardHasValue && (
          <Button variant="ghost" size="sm" onClick={() => resetFieldValue(el.id)}>
            Use template default text
          </Button>
        )}
      </Section>
      <StylePicker el={el} editable={editable} />
      <Section title={preset ? `Style · ${preset.name}` : 'Default style'}>
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
      <Section title="Effects">
        <Row>
          <ColorField
            label="Outline"
            allowNone
            value={s.outlineColor ?? null}
            disabled={!editable}
            onChange={(v) => {
              setStyle('outlineColor', v ?? undefined)
              if (v && !s.outlineWidthEm) setStyle('outlineWidthEm', 0.06)
            }}
          />
          <NumberField
            label="Outline width"
            unit="%"
            min={0}
            max={40}
            step={1}
            precision={0}
            value={Math.round((s.outlineWidthEm ?? 0) * 100)}
            disabled={!editable || !s.outlineColor}
            onChange={(v) => setStyle('outlineWidthEm', Math.max(0, v) / 100)}
          />
        </Row>
        <ColorField
          label="Shadow"
          allowNone
          value={s.shadowColor ?? null}
          disabled={!editable}
          onChange={(v) => {
            setStyle('shadowColor', v ?? undefined)
            if (v && !s.shadowDxEm && !s.shadowDyEm) {
              setStyle('shadowDxEm', 0.06)
              setStyle('shadowDyEm', 0.06)
            }
          }}
        />
        {s.shadowColor && (
          <Row cols={3}>
            <NumberField
              label="Shadow X"
              unit="%"
              step={1}
              precision={0}
              value={Math.round((s.shadowDxEm ?? 0) * 100)}
              disabled={!editable}
              onChange={(v) => setStyle('shadowDxEm', v / 100)}
            />
            <NumberField
              label="Shadow Y"
              unit="%"
              step={1}
              precision={0}
              value={Math.round((s.shadowDyEm ?? 0) * 100)}
              disabled={!editable}
              onChange={(v) => setStyle('shadowDyEm', v / 100)}
            />
            <NumberField
              label="Opacity"
              unit="%"
              min={0}
              max={100}
              step={5}
              precision={0}
              value={Math.round((s.shadowOpacity ?? 1) * 100)}
              disabled={!editable}
              onChange={(v) => setStyle('shadowOpacity', Math.min(100, Math.max(0, v)) / 100)}
            />
          </Row>
        )}
        <p className="text-xs text-muted-foreground">
          Sizes are % of the font size, so effects grow and shrink with the text (and auto-shrink).
          Shadows are sharp, with no blur, so they print exactly as shown.
        </p>
      </Section>
      <Section title="Keywords">
        <label className="flex items-center justify-between gap-3 text-sm">
          Style keywords in this text
          <Switch
            checked={el.styleKeywords !== false}
            disabled={!editable}
            onCheckedChange={(v) =>
              set((e) => {
                if (v) delete e.styleKeywords
                else e.styleKeywords = false
              }, 'kw')
            }
            aria-label="Style keywords in this text"
          />
        </label>
        <Button variant="outline" size="sm" onClick={() => useUi.getState().setKeywordsOpen(true)}>
          <Highlighter /> Edit keywords…
        </Button>
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

function SymbolHint() {
  const assets = useEditor((s) => s.library.assets)
  const names = useMemo(
    () =>
      Object.values(assets)
        .map((a) => a.tags[0])
        .filter(Boolean)
        .sort(),
    [assets],
  )
  if (!names.length) return null
  return (
    <p className="text-xs text-muted-foreground">
      Symbols:{' '}
      {names.map((n) => (
        <code key={n} className="mr-1 rounded bg-muted px-1 font-mono">{`{${n}}`}</code>
      ))}
    </p>
  )
}

/** Shared styles: link this text to one, create one from it, rename, detach or delete. */
function StylePicker({ el, editable }: { el: TextElement; editable: boolean }) {
  const presets = useEditor((s) => s.doc?.stylePresets)
  const list = useMemo(
    () => Object.values(presets ?? {}).sort((a, b) => a.name.localeCompare(b.name)),
    [presets],
  )
  const preset = el.stylePresetId ? presets?.[el.stylePresetId] : undefined
  const uses = useEditor(() => (preset ? presetUsage(preset.id) : 0))
  return (
    <Section title="Shared style">
      <div className="flex gap-1.5">
        <NativeSelect
          aria-label="Shared style"
          value={preset?.id ?? ''}
          disabled={!editable}
          onChange={(e) => linkStyle(el.id, e.target.value || null)}
        >
          <option value="">None (own style)</option>
          {list.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </NativeSelect>
        <IconButton
          label="New style from this text"
          variant="outline"
          size="icon-sm"
          disabled={!editable}
          onClick={async () => {
            const name = await askText({
              title: 'New style from this text',
              label: 'Style name',
              initial: preset ? `${preset.name} copy` : 'Heading',
              okLabel: 'Create',
            })
            if (name) createStyleFromText(el.id, name)
          }}
        >
          <Plus />
        </IconButton>
      </div>
      {preset && (
        <>
          <p className="text-xs text-muted-foreground">
            Changes below update every text using “{preset.name}” ({uses} text
            {uses === 1 ? '' : 's'}).
          </p>
          <div className="flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={!editable}
              onClick={async () => {
                const name = await askText({
                  title: 'Rename style',
                  label: 'Style name',
                  initial: preset.name,
                  okLabel: 'Rename',
                })
                if (name) renameStyle(preset.id, name)
              }}
            >
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!editable}
              onClick={() => linkStyle(el.id, null)}
            >
              Detach
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              disabled={!editable}
              onClick={async () => {
                if (
                  await askConfirm({
                    title: `Delete the style “${preset.name}”?`,
                    description: 'Texts using it keep their current look.',
                    okLabel: 'Delete',
                    danger: true,
                  })
                )
                  deleteStyle(preset.id)
              }}
            >
              Delete
            </Button>
          </div>
        </>
      )}
    </Section>
  )
}
