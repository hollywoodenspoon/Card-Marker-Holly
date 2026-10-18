import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  FlipHorizontal2,
  FlipVertical2,
} from 'lucide-react'
import { alignSelection, reorderElement, updateElement } from '@/core/editor/elementCommands'
import type { Element } from '@/core/model/types'
import { IconButton } from '@/ui/components/ui/button'
import { NumberField, Row, Section } from '@/ui/components/fields'
import { Slider } from '@/ui/components/ui/slider'
import { Label } from '@/ui/components/ui/input'

export function AlignButtons({ disabled }: { disabled?: boolean }) {
  const items = [
    ['left', AlignStartVertical, 'Align left'],
    ['hcenter', AlignCenterVertical, 'Align centre'],
    ['right', AlignEndVertical, 'Align right'],
    ['top', AlignStartHorizontal, 'Align top'],
    ['vcenter', AlignCenterHorizontal, 'Align middle'],
    ['bottom', AlignEndHorizontal, 'Align bottom'],
  ] as const
  return (
    <div className="grid grid-cols-6 gap-0.5">
      {items.map(([mode, Icon, label]) => (
        <IconButton
          key={mode}
          label={label}
          size="icon-sm"
          disabled={disabled}
          onClick={() => alignSelection(mode)}
        >
          <Icon />
        </IconButton>
      ))}
    </div>
  )
}

export function GeometrySection({ el, editable }: { el: Element; editable: boolean }) {
  const isGroup = el.type === 'group'
  const set = (fn: (e: Element) => void, key: string) =>
    updateElement(el.id, (d) => fn(d as Element), `${key}:${el.id}`)
  return (
    <Section title="Layout">
      <AlignButtons disabled={!editable} />
      {!isGroup && (
        <>
          <Row>
            <NumberField
              label="X"
              unit="mm"
              value={el.xMm}
              disabled={!editable}
              onChange={(v) => set((e) => void (e.xMm = v), 'x')}
            />
            <NumberField
              label="Y"
              unit="mm"
              value={el.yMm}
              disabled={!editable}
              onChange={(v) => set((e) => void (e.yMm = v), 'y')}
            />
          </Row>
          <Row>
            <NumberField
              label="Width"
              unit="mm"
              min={0.5}
              value={el.wMm}
              disabled={!editable}
              onChange={(v) => set((e) => void (e.wMm = v), 'w')}
            />
            <NumberField
              label="Height"
              unit="mm"
              min={0.5}
              value={el.hMm}
              disabled={!editable}
              onChange={(v) => set((e) => void (e.hMm = v), 'h')}
            />
          </Row>
          <Row>
            <NumberField
              label="Rotation"
              unit="°"
              step={1}
              value={el.rotation}
              disabled={!editable}
              onChange={(v) => set((e) => void (e.rotation = ((v % 360) + 360) % 360), 'rot')}
            />
            <div className="flex flex-col gap-1">
              <Label>Flip</Label>
              <div className="flex gap-1">
                <IconButton
                  label="Flip horizontally"
                  variant="outline"
                  size="icon-sm"
                  active={el.flipX}
                  disabled={!editable}
                  onClick={() => set((e) => void (e.flipX = !e.flipX), 'fx')}
                >
                  <FlipHorizontal2 />
                </IconButton>
                <IconButton
                  label="Flip vertically"
                  variant="outline"
                  size="icon-sm"
                  active={el.flipY}
                  disabled={!editable}
                  onClick={() => set((e) => void (e.flipY = !e.flipY), 'fy')}
                >
                  <FlipVertical2 />
                </IconButton>
              </div>
            </div>
          </Row>
        </>
      )}
      <div className="flex flex-col gap-1">
        <Label>Opacity · {Math.round(el.opacity * 100)}%</Label>
        <Slider
          aria-label="Opacity"
          min={0}
          max={100}
          step={1}
          disabled={!editable}
          value={[Math.round(el.opacity * 100)]}
          onValueChange={([v]) => set((e) => void (e.opacity = v / 100), 'opacity')}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label>Arrange</Label>
        <div className="grid grid-cols-4 gap-0.5">
          <IconButton
            label="Bring to front"
            size="icon-sm"
            disabled={!editable}
            onClick={() => reorderElement(el.id, 'front')}
          >
            <ArrowUpToLine />
          </IconButton>
          <IconButton
            label="Bring forward"
            size="icon-sm"
            disabled={!editable}
            onClick={() => reorderElement(el.id, 'forward')}
          >
            <ChevronUp />
          </IconButton>
          <IconButton
            label="Send backward"
            size="icon-sm"
            disabled={!editable}
            onClick={() => reorderElement(el.id, 'backward')}
          >
            <ChevronDown />
          </IconButton>
          <IconButton
            label="Send to back"
            size="icon-sm"
            disabled={!editable}
            onClick={() => reorderElement(el.id, 'back')}
          >
            <ArrowDownToLine />
          </IconButton>
        </div>
      </div>
    </Section>
  )
}
