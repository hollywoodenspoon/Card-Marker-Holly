import { AlertTriangle, Crop, ImageUp, RotateCcw } from '@/ui/icons'
import { clickWord } from '@/lib/pointer'
import { assetResolver } from '@/assets/assetResolver'
import { IMAGE_ACCEPT } from '@/assets/imageAssets'
import { setView, useEditor } from '@/core/editor/editorStore'
import { updateElement } from '@/core/editor/elementCommands'
import type { ImageElement, ImageFieldElement } from '@/core/model/types'
import { croppedImageDpi, dpiFromMmPerPx, framePlacement, LOW_DPI } from '@/core/render/imageMath'
import { setImageFieldValue, resetFieldValue } from '@/templates/fieldCommands'
import { useImageValue } from '@/ui/panels/properties/useFieldValues'
import { pickFiles, replaceImage } from '@/ui/actions/imageActions'
import { Button } from '@/ui/components/ui/button'
import { Label } from '@/ui/components/ui/input'
import { Slider } from '@/ui/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { Row, Section } from '@/ui/components/fields'

function DpiNote({ dpi }: { dpi: number | undefined }) {
  if (dpi === undefined) return null
  const low = dpi < LOW_DPI
  return (
    <p
      className={
        low ? 'flex items-start gap-1.5 text-xs text-warning' : 'text-xs text-muted-foreground'
      }
    >
      {low && <AlertTriangle className="mt-px size-3.5 shrink-0" />}
      {low
        ? `Prints at about ${Math.round(dpi)} DPI. Use a larger image (300 DPI or more) for sharp print.`
        : `Prints at about ${Math.round(dpi)} DPI.`}
    </p>
  )
}

export function ImageSection({ el, editable }: { el: ImageElement; editable: boolean }) {
  const cropId = useEditor((s) => s.view.cropId)
  const info = useEditor((s) => s.library.assets[el.assetId])
  const dpi =
    info && !info.isVector
      ? croppedImageDpi(el.wMm, el.hMm, info.widthPx, info.heightPx, el.crop)
      : undefined
  const cropping = cropId === el.id
  return (
    <Section title="Image">
      {!info && (
        <p className="text-xs text-danger">The image file is missing. Replace it to fix.</p>
      )}
      <Row>
        <Button
          variant={cropping ? 'default' : 'outline'}
          size="sm"
          disabled={!editable || !info}
          onClick={() => setView({ cropId: cropping ? null : el.id })}
        >
          <Crop /> {cropping ? 'Done' : 'Crop'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!editable}
          onClick={async () => {
            const [f] = await pickFiles(IMAGE_ACCEPT, false)
            if (f) await replaceImage(el.id, f)
          }}
        >
          <ImageUp /> Replace
        </Button>
      </Row>
      {cropping && (
        <p className="text-xs text-muted-foreground">
          Drag the picture to move it. Drag the handles to change what is shown.
        </p>
      )}
      {el.crop && !cropping && (
        <Button
          variant="ghost"
          size="sm"
          disabled={!editable}
          onClick={() => updateElement(el.id, (e) => void (e.type === 'image' && delete e.crop))}
        >
          <RotateCcw /> Reset crop
        </Button>
      )}
      <DpiNote dpi={dpi} />
      {info?.isVector && (
        <p className="text-xs text-muted-foreground">SVG — stays sharp at any size.</p>
      )}
    </Section>
  )
}

export function ImageFieldSection({ el }: { el: ImageFieldElement }) {
  const value = useImageValue(el.id)
  const cropId = useEditor((s) => s.view.cropId)
  const mode = useEditor((s) => s.view.mode)
  const info = useEditor((s) => (value?.assetId ? s.library.assets[value.assetId] : undefined))
  if (!value) return null
  const p = info ? framePlacement(el.wMm, el.hMm, info.widthPx, info.heightPx, value) : undefined
  const dpi = info && !info.isVector && p ? dpiFromMmPerPx(p.mmPerPx) : undefined
  const cropping = cropId === el.id
  const perCard = mode === 'card'
  const set = (patch: Parameters<typeof setImageFieldValue>[1], key?: string) =>
    setImageFieldValue(el.id, patch, key ? `${key}:${el.id}` : undefined)

  return (
    <Section title={perCard ? 'Art for this card' : 'Default art'}>
      {info && (
        <img
          src={assetResolver.getUrl(info.id)}
          alt=""
          className="h-24 w-full rounded-md border bg-muted object-contain"
        />
      )}
      {/* An empty frame has its Choose image button on the card itself: one place to look. */}
      {info && (
        <Row>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const [f] = await pickFiles(IMAGE_ACCEPT, false)
              if (f) await replaceImage(el.id, f)
            }}
          >
            <ImageUp /> Replace
          </Button>
          <Button
            variant={cropping ? 'default' : 'outline'}
            size="sm"
            disabled={!info || !perCard}
            title={!perCard ? 'Framing is set per card' : undefined}
            onClick={() => setView({ cropId: cropping ? null : el.id })}
          >
            <Crop /> {cropping ? 'Done' : 'Reposition'}
          </Button>
        </Row>
      )}
      <p className="text-xs text-muted-foreground">
        {info ? 'To swap it' : 'To add one'}, use the button on the card, {clickWord()} an image in
        Assets, or drop one on the frame.
      </p>
      <div className="flex flex-col gap-1">
        <Label>Fit</Label>
        <Tabs value={value.fit ?? el.fit} onValueChange={(v) => set({ fit: v as 'fill' | 'fit' })}>
          <TabsList className="w-full">
            <TabsTrigger value="fill">Fill frame</TabsTrigger>
            <TabsTrigger value="fit">Fit inside</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {perCard && info && (
        <div className="flex flex-col gap-1">
          <Label>Zoom · {Math.round(value.zoom * 100)}%</Label>
          <Slider
            aria-label="Zoom image"
            min={100}
            max={400}
            step={1}
            value={[Math.round(value.zoom * 100)]}
            onValueChange={([v]) => set({ zoom: v / 100 }, 'zoom')}
          />
        </div>
      )}
      {perCard && (value.offsetXMm || value.offsetYMm || value.zoom !== 1) ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => set({ offsetXMm: 0, offsetYMm: 0, zoom: 1 })}
        >
          <RotateCcw /> Reset framing
        </Button>
      ) : null}
      {perCard && value.assetId && value.assetId !== el.defaultAssetId && (
        <Button variant="ghost" size="sm" onClick={() => resetFieldValue(el.id)}>
          Use template default
        </Button>
      )}
      <DpiNote dpi={dpi} />
    </Section>
  )
}
