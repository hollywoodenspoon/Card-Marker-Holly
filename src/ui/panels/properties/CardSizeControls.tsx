import { RectangleHorizontal, RectangleVertical } from '@/ui/icons'
import { useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditor } from '@/core/editor/editorStore'
import { setCardSize } from '@/core/editor/projectCommands'
import { activeTemplate } from '@/core/editor/selectors'
import type { CardSize, Template } from '@/core/model/types'
import { matchPreset, orientationOf, presetSize, withOrientation } from '@/core/units/presets'
import { setFrontAnchor, setGroupSize } from '@/templates/sizeCommands'
import { anchorOf, groupOf, resizeConcerns, sameSize } from '@/templates/sizeGroups'
import { askConfirm } from '@/ui/components/feedback'
import { IconButton } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { NumberField, Row } from '@/ui/components/fields'
import { SizePresetOptions } from './SizePresetOptions'

const list = (names: string[]) =>
  names.length <= 2 ? names.join(' and ') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`

/** "Creature front + Basic back" for the size label (no "Basic front front"). */
function groupLabel(group: Template[]) {
  const named = (t: Template) =>
    t.name.toLowerCase().endsWith(t.side) ? t.name : `${t.name} ${t.side}`
  return group.map(named).join(' + ')
}

/** Ask before a resize that could move designed parts; true when nothing would be affected. */
async function confirmResize(templateId: string) {
  const { doc } = useEditor.getState()
  if (!doc) return false
  const concerns = resizeConcerns(doc.templates, doc.cards, templateId)
  if (!concerns) return true
  const what = [
    concerns.edited.length &&
      `${list(concerns.edited.map((t) => t.name))} ${concerns.edited.length === 1 ? 'has' : 'have'} been designed`,
    concerns.cardsWithLayers.length &&
      `${concerns.cardsWithLayers.length} card${concerns.cardsWithLayers.length === 1 ? ' has its' : 's have their'} own layers`,
  ].filter(Boolean)
  return askConfirm({
    title: 'Change the card size?',
    description: `${what.join(', and ')}. Every part keeps its position in mm, so some may end up off the card or need moving. You can undo this.`,
    okLabel: 'Change size',
  })
}

export function CardSizeControls() {
  const tpl = useEditor((s) => activeTemplate(s))
  const fallback = useEditor((s) => s.doc?.project.defaultSize)
  const group = useEditor(useShallow((s) => (s.doc && tpl ? groupOf(s.doc.templates, tpl.id) : [])))
  // A typing run (width or height) asks once, not on every keystroke.
  const confirmedFor = useRef<string | null>(null)
  const size = tpl?.size ?? fallback
  if (!size) return null
  const preset = matchPreset(size.widthMm, size.heightMm)
  const orient = orientationOf(size)
  const groupKey = group.map((t) => t.id).join()

  async function resize(next: CardSize, coalesce?: string) {
    if (!tpl) return setCardSize(next, coalesce)
    if (confirmedFor.current !== groupKey) {
      if (!(await confirmResize(tpl.id))) return
      if (coalesce) confirmedFor.current = groupKey
    }
    setGroupSize(tpl.id, next, coalesce)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="size-preset">Card size</Label>
        {group.length > 1 && (
          <p className="text-xs text-muted-foreground" data-testid="size-group">
            Size of {groupLabel(group)} ({group.length} templates)
          </p>
        )}
        <div className="flex gap-1.5">
          <NativeSelect
            id="size-preset"
            value={preset}
            onChange={(e) => {
              if (e.target.value === 'custom') return resize({ ...size, presetId: 'custom' })
              void resize(withOrientation(presetSize(e.target.value), orient))
            }}
          >
            <SizePresetOptions />
          </NativeSelect>
          <IconButton
            label="Portrait"
            variant="outline"
            size="icon-sm"
            active={orient === 'portrait'}
            onClick={() => resize(withOrientation(size, 'portrait'))}
          >
            <RectangleVertical />
          </IconButton>
          <IconButton
            label="Landscape"
            variant="outline"
            size="icon-sm"
            active={orient === 'landscape'}
            onClick={() => resize(withOrientation(size, 'landscape'))}
          >
            <RectangleHorizontal />
          </IconButton>
        </div>
      </div>
      <Row>
        <NumberField
          label="Width"
          unit="mm"
          min={10}
          max={300}
          value={size.widthMm}
          onChange={(v) =>
            resize({ ...size, widthMm: v, presetId: matchPreset(v, size.heightMm) }, 'size')
          }
        />
        <NumberField
          label="Height"
          unit="mm"
          min={10}
          max={300}
          value={size.heightMm}
          onChange={(v) =>
            resize({ ...size, heightMm: v, presetId: matchPreset(size.widthMm, v) }, 'size')
          }
        />
      </Row>
      {tpl?.side === 'front' && <FrontAnchor front={tpl} />}
    </div>
  )
}

/** Which back a front prints with. A back of another size resizes the front to match. */
function FrontAnchor({ front }: { front: Template }) {
  const backs = useEditor(
    useShallow((s) =>
      Object.values(s.doc?.templates ?? {})
        .filter((t) => t.side === 'back')
        .sort((a, b) => a.createdAt - b.createdAt),
    ),
  )
  const current = useEditor((s) => (s.doc ? anchorOf(s.doc.templates, front.id) : undefined))
  if (!backs.length) return null
  const mm = (t: Template) => `${t.size.widthMm} × ${t.size.heightMm} mm`
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="front-anchor">Back for this front</Label>
      <NativeSelect
        id="front-anchor"
        value={current?.id ?? ''}
        onChange={async (e) => {
          const back = backs.find((b) => b.id === e.target.value)
          if (!back) return
          if (!sameSize(back.size, front.size)) {
            const { doc } = useEditor.getState()
            const designed =
              doc && (front.edited || resizeConcerns(doc.templates, doc.cards, front.id))
            if (
              designed &&
              !(await askConfirm({
                title: `Use ${back.name} for ${front.name}?`,
                description: `${back.name} is ${mm(back)}, so ${front.name} changes to that size. Every part keeps its position in mm. You can undo this.`,
                okLabel: 'Change size',
              }))
            )
              return
          }
          setFrontAnchor(front.id, back.id)
        }}
      >
        {!current && <option value="">Choose a back…</option>}
        {backs.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} ({mm(b)})
          </option>
        ))}
      </NativeSelect>
    </div>
  )
}
