import { RectangleHorizontal, RectangleVertical } from '@/ui/icons'
import { useEffect, useState } from 'react'
import { createAndOpenProject } from '@/app/session'
import { pathLabel } from '@/platform/desktop'
import { folderStore } from '@/storage'
import { folderName } from '@/storage/folderBackend'
import type { Orientation } from '@/core/model/types'
import { DEFAULT_PRESET_ID, orientationOf, presetSize, withOrientation } from '@/core/units/presets'
import { formatSize, type UnitSettings } from '@/core/units/units'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { NumberField, Row } from '@/ui/components/fields'
import { readDefaultUnits, UnitsContext, writeDefaultUnits } from '@/ui/components/useUnits'
import { SizePresetOptions } from '@/ui/panels/properties/SizePresetOptions'
import { UnitsPicker } from '@/ui/panels/properties/UnitsControls'

/** New project: name, card size, orientation, units and bleed, chosen up front. */
export function NewProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="New project"
        description="Pick a card size and the units you like to work in. Both can be changed later."
      >
        {open && <NewProjectForm onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function NewProjectForm({ onCancel }: { onCancel: () => void }) {
  const [name, setName] = useState('My card game')
  const [units, setUnits] = useState<UnitSettings>(readDefaultUnits)
  const [preset, setPreset] = useState(DEFAULT_PRESET_ID)
  const [orient, setOrient] = useState<Orientation>('portrait')
  const [custom, setCustom] = useState({ w: 63, h: 88 })
  const [bleed, setBleed] = useState(3)
  const base =
    preset === 'custom'
      ? { presetId: 'custom', widthMm: custom.w, heightMm: custom.h }
      : presetSize(preset)
  const size = preset === 'custom' ? base : withOrientation(base, orient)
  const shownOrient = orientationOf(size)
  const turn = (o: Orientation) => {
    if (preset === 'custom' && orientationOf(base) !== o) setCustom({ w: custom.h, h: custom.w })
    setOrient(o)
  }
  // Preview fits a 96 px box.
  const k = 96 / Math.max(size.widthMm, size.heightMm)

  return (
    <UnitsContext.Provider value={units}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          writeDefaultUnits(units)
          void createAndOpenProject(name.trim() || 'Untitled', { size, bleedMm: bleed, units })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="np-name">Name</Label>
          <Input id="np-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <UnitsPicker value={units} onChange={setUnits} idPrefix="np" />
        <div className="flex gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="np-size">Card size</Label>
              <div className="flex gap-1.5">
                <NativeSelect
                  id="np-size"
                  value={preset}
                  onChange={(e) => {
                    if (e.target.value === 'custom')
                      setCustom({ w: size.widthMm, h: size.heightMm })
                    setPreset(e.target.value)
                  }}
                >
                  <SizePresetOptions />
                </NativeSelect>
                <IconButton
                  label="Portrait"
                  variant="outline"
                  size="icon-sm"
                  active={shownOrient === 'portrait'}
                  onClick={() => turn('portrait')}
                >
                  <RectangleVertical />
                </IconButton>
                <IconButton
                  label="Landscape"
                  variant="outline"
                  size="icon-sm"
                  active={shownOrient === 'landscape'}
                  onClick={() => turn('landscape')}
                >
                  <RectangleHorizontal />
                </IconButton>
              </div>
            </div>
            {preset === 'custom' && (
              <Row>
                <NumberField
                  id="np-w"
                  label="Width"
                  unit="mm"
                  min={10}
                  max={300}
                  value={custom.w}
                  onChange={(w) => setCustom({ ...custom, w })}
                />
                <NumberField
                  id="np-h"
                  label="Height"
                  unit="mm"
                  min={10}
                  max={300}
                  value={custom.h}
                  onChange={(h) => setCustom({ ...custom, h })}
                />
              </Row>
            )}
            <NumberField
              id="np-bleed"
              label="Bleed"
              unit="mm"
              min={0}
              max={10}
              value={bleed}
              onChange={setBleed}
            />
          </div>
          <div className="flex w-28 shrink-0 flex-col items-center justify-center gap-1.5">
            <div
              className="rounded-sm border-2 border-accent bg-accent-soft"
              style={{ width: size.widthMm * k, height: size.heightMm * k }}
              aria-hidden
            />
            <span className="text-center text-xs text-muted-foreground" data-testid="np-size">
              {formatSize(size.widthMm, size.heightMm, units)}
            </span>
          </div>
        </div>
        <ProjectLocation name={name} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Create</Button>
        </div>
      </form>
    </UnitsContext.Provider>
  )
}

/** Desktop app: where the new project's folder goes, with a way to change it. */
function ProjectLocation({ name }: { name: string }) {
  const folders = folderStore()
  const [dir, setDir] = useState<string | null>(null)
  useEffect(() => {
    void folders?.projectsDir().then(setDir)
  }, [folders])
  if (!folders || !dir) return null
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="min-w-0 flex-1 break-all">
        Saved in {pathLabel(dir)}/{folderName(name.trim() || 'Untitled')}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={async () => {
          const picked = await folders.bridge.pickFolder({
            title: 'Where should new projects go?',
            defaultPath: dir,
          })
          if (!picked) return
          await folders.setProjectsDir(picked)
          setDir(picked)
        }}
      >
        Change…
      </Button>
    </div>
  )
}
