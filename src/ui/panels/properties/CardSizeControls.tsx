import { RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { useEditor } from '@/core/editor/editorStore'
import { setCardSize } from '@/core/editor/projectCommands'
import { matchPreset, orientationOf, presetSize, withOrientation } from '@/core/units/presets'
import { IconButton } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { NumberField, Row } from '@/ui/components/fields'
import { SizePresetOptions } from './SizePresetOptions'

export function CardSizeControls() {
  const size = useEditor((s) => s.doc?.project.defaultSize)
  if (!size) return null
  const preset = matchPreset(size.widthMm, size.heightMm)
  const orient = orientationOf(size)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor="size-preset">Card size</Label>
        <div className="flex gap-1.5">
          <NativeSelect
            id="size-preset"
            value={preset}
            onChange={(e) => {
              if (e.target.value === 'custom') return setCardSize({ ...size, presetId: 'custom' })
              setCardSize(withOrientation(presetSize(e.target.value), orient))
            }}
          >
            <SizePresetOptions />
          </NativeSelect>
          <IconButton
            label="Portrait"
            variant="outline"
            size="icon-sm"
            active={orient === 'portrait'}
            onClick={() => setCardSize(withOrientation(size, 'portrait'))}
          >
            <RectangleVertical />
          </IconButton>
          <IconButton
            label="Landscape"
            variant="outline"
            size="icon-sm"
            active={orient === 'landscape'}
            onClick={() => setCardSize(withOrientation(size, 'landscape'))}
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
            setCardSize({ ...size, widthMm: v, presetId: matchPreset(v, size.heightMm) }, 'size')
          }
        />
        <NumberField
          label="Height"
          unit="mm"
          min={10}
          max={300}
          value={size.heightMm}
          onChange={(v) =>
            setCardSize({ ...size, heightMm: v, presetId: matchPreset(size.widthMm, v) }, 'size')
          }
        />
      </Row>
    </div>
  )
}
