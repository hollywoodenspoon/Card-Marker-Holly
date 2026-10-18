import { ArrowLeftRight, ArrowUpDown, Minus, Plus, RotateCcw, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { useEditor } from '@/core/editor/editorStore'
import { updateElement } from '@/core/editor/elementCommands'
import type { IconRowElement } from '@/core/model/types'
import { currentCount, hasCardValue, resetFieldValue, setCount } from '@/templates/fieldCommands'
import { chooseIconFor, setIconRowIcon } from '@/ui/actions/imageActions'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Label } from '@/ui/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover'
import { Switch } from '@/ui/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { NumberField, Row, Section } from '@/ui/components/fields'

export function IconRowSection({ el, editable }: { el: IconRowElement; editable: boolean }) {
  const mode = useEditor((s) => s.view.mode)
  const count = useEditor(() => currentCount(el.id) ?? 0)
  const overridden = useEditor(() => hasCardValue(el.id))
  const set = (fn: (e: IconRowElement) => void, key: string) =>
    updateElement(el.id, (d) => fn(d as IconRowElement), `${key}:${el.id}`)
  const perCard = mode === 'card' && !editable

  return (
    <Section title="Icon row">
      <div className="flex flex-col gap-1">
        <Label>{perCard ? 'Count for this card' : 'Default count'}</Label>
        <div className="flex items-center gap-2">
          <IconButton
            label="One less"
            variant="outline"
            size="icon-sm"
            disabled={count <= 0}
            onClick={() => setCount(el.id, count - 1)}
          >
            <Minus />
          </IconButton>
          <input
            aria-label="Count"
            type="number"
            min={0}
            max={99}
            value={count}
            onChange={(e) => setCount(el.id, Number(e.target.value) || 0, 'count:' + el.id)}
            className="h-11 w-16 rounded-md border border-input bg-panel text-center text-base tabular-nums outline-none focus-visible:border-accent md:h-8 md:text-sm"
          />
          <IconButton
            label="One more"
            variant="outline"
            size="icon-sm"
            onClick={() => setCount(el.id, count + 1)}
          >
            <Plus />
          </IconButton>
          {overridden && (
            <Button variant="ghost" size="sm" onClick={() => resetFieldValue(el.id)}>
              <RotateCcw /> Default
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label>Icon</Label>
        <IconPicker el={el} disabled={!editable} />
        {!editable && (
          <p className="text-xs text-muted-foreground">The icon is set in the template.</p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <Label>Direction</Label>
        <Tabs
          value={el.direction}
          onValueChange={(v) =>
            editable && set((e) => void (e.direction = v as IconRowElement['direction']), 'dir')
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="horizontal" disabled={!editable}>
              <ArrowLeftRight /> Row
            </TabsTrigger>
            <TabsTrigger value="vertical" disabled={!editable}>
              <ArrowUpDown /> Column
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Row>
        <NumberField
          label="Icon size"
          unit="mm"
          min={0.5}
          max={100}
          step={0.5}
          value={el.iconMm}
          disabled={!editable}
          onChange={(v) => set((e) => void (e.iconMm = v), 'icon')}
        />
        <NumberField
          label="Gap"
          unit="mm"
          min={0}
          max={50}
          step={0.25}
          value={el.gapMm}
          disabled={!editable}
          onChange={(v) => set((e) => void (e.gapMm = v), 'gap')}
        />
      </Row>
      <label className="flex items-center justify-between gap-3 text-sm">
        Shrink to fit the box
        <Switch
          checked={el.fitToBox}
          disabled={!editable}
          onCheckedChange={(v) => set((e) => void (e.fitToBox = v), 'fit')}
          aria-label="Shrink to fit the box"
        />
      </label>
      <p className="text-xs text-muted-foreground">
        Icons are centred in the box, so the row stays centred whatever the count.
      </p>
    </Section>
  )
}

function IconPicker({ el, disabled }: { el: IconRowElement; disabled: boolean }) {
  const [open, setOpen] = useState(false)
  const assets = useEditor((s) => s.library.assets)
  const list = useMemo(
    () => Object.values(assets).sort((a, b) => b.createdAt - a.createdAt),
    [assets],
  )
  const current = el.assetId ? assets[el.assetId] : undefined
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="justify-start">
          {current ? (
            <img src={assetResolver.getUrl(current.id)} alt="" className="size-6 object-contain" />
          ) : null}
          {current ? current.name : 'Choose icon'}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <div className="grid max-h-60 grid-cols-4 gap-1.5 overflow-auto">
          {list.map((a) => (
            <button
              key={a.id}
              type="button"
              title={a.name}
              onClick={() => {
                setIconRowIcon(el.id, a.id)
                setOpen(false)
              }}
              className="aspect-square rounded-md border bg-muted p-1 hover:border-accent data-[on=true]:border-accent"
              data-on={a.id === el.assetId}
            >
              <img
                src={assetResolver.getUrl(a.id)}
                alt={a.name}
                className="size-full object-contain"
              />
            </button>
          ))}
        </div>
        {!list.length && (
          <p className="pb-2 text-sm text-muted-foreground">No images uploaded yet.</p>
        )}
        <Button
          variant="secondary"
          size="sm"
          className="mt-2 w-full"
          onClick={async () => {
            setOpen(false)
            await chooseIconFor(el.id)
          }}
        >
          <Upload /> Upload icon
        </Button>
      </PopoverContent>
    </Popover>
  )
}
