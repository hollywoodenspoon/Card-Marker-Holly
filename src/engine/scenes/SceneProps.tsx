import { useState } from 'react'
import { Eye, EyeOff, Image as ImageIcon, PenTool, Trash2, X } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Input, Label, NativeSelect } from '@/ui/components/ui/input'
import { Slider } from '@/ui/components/ui/slider'
import { ColorField, NumberField, Row, Section } from '@/ui/components/fields'
import { openShapeEditor } from '@/vector/shapeRequest'
import { allItems, newDoc, newLayer, newPath, type VectorDoc } from '@/vector/model'
import type { SubPath } from '@/vector/geometry'
import { useGameCards } from '../cards/gameCards'
import { EventsEditor } from '../events/EventsEditor'
import type { GameEvent } from '../model/events'
import type { ClickArea, Glow, PictureScene, SceneObject } from '../model/game'
import { useGame } from '../store/gameStore'
import { assets } from '../storage/assets'
import { ImagePicker, Thumb } from './ImagePicker'
import { imageUrl } from './images'

type EditScene = (recipe: (s: PictureScene) => void, key?: string) => void

/** The right panel for a picture scene: the selected area or object, or the scene itself. */
export function SceneProps({ scene }: { scene: PictureScene }) {
  const selection = useGame((s) => s.selection)
  const commit = useGame((s) => s.commit)
  const edit: EditScene = (recipe, key) =>
    commit((g) => {
      const s = g.scenes.find((x) => x.id === scene.id)
      if (s?.kind === 'picture') recipe(s)
    }, key)
  const area =
    selection?.kind === 'area' ? scene.areas.find((a) => a.id === selection.id) : undefined
  const obj =
    selection?.kind === 'object' ? scene.objects.find((o) => o.id === selection.id) : undefined
  return (
    <aside className="h-full w-full overflow-y-auto" aria-label="Properties">
      {area ? (
        <AreaProps key={area.id} scene={scene} area={area} edit={edit} />
      ) : obj ? (
        <ObjectProps key={obj.id} obj={obj} edit={edit} />
      ) : (
        <ScenePanel scene={scene} edit={edit} />
      )}
    </aside>
  )
}

/** Turns a list-of-events recipe into a scene edit for one thing's events. */
const eventsOf =
  (edit: EditScene, find: (s: PictureScene) => { events: GameEvent[] } | undefined) =>
  (recipe: (events: GameEvent[]) => void) =>
    edit((s) => {
      const t = find(s)
      if (t) recipe(t.events)
    })

function NameField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="scene-thing-name">Name</Label>
      <Input
        id="scene-thing-name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 md:h-8"
      />
    </div>
  )
}

function ScenePanel({ scene, edit }: { scene: PictureScene; edit: EditScene }) {
  const [picking, setPicking] = useState(false)
  const isStart = useGame((s) => s.game.startScene === scene.id)
  const setBackground = async (ref: PictureScene['background']) => {
    // A new background sets the scene's size, so areas line up with its pixels.
    let size: { w: number; h: number } | null = null
    if (ref?.store === 'game') {
      const row = await assets.row(ref.id)
      if (row?.width && row.height) size = { w: row.width, h: row.height }
    } else if (ref) {
      const url = await imageUrl(ref)
      if (url) size = await naturalSize(url)
    }
    edit((s) => {
      s.background = ref
      if (size) {
        s.width = size.w
        s.height = size.h
      }
    })
  }
  return (
    <>
      <Section title="Scene">
        <NameField
          value={scene.name}
          onChange={(v) => edit((s) => void (s.name = v), `name:${scene.id}`)}
        />
        <div className="flex flex-col gap-1">
          <Label>Background</Label>
          <div className="flex items-center gap-2">
            {scene.background && <Thumb image={scene.background} className="size-14" />}
            <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
              <ImageIcon /> {scene.background ? 'Change…' : 'Choose…'}
            </Button>
            {scene.background && (
              <IconButton label="Remove background" onClick={() => void setBackground(null)}>
                <X />
              </IconButton>
            )}
          </div>
        </div>
        <Row>
          <NumberField
            label="Width (px)"
            value={scene.width}
            step={10}
            min={64}
            precision={0}
            onChange={(v) => edit((s) => void (s.width = Math.round(v)), `w:${scene.id}`)}
          />
          <NumberField
            label="Height (px)"
            value={scene.height}
            step={10}
            min={64}
            precision={0}
            onChange={(v) => edit((s) => void (s.height = Math.round(v)), `h:${scene.id}`)}
          />
        </Row>
        <Button
          size="sm"
          variant="outline"
          disabled={isStart}
          onClick={() => useGame.getState().commit((g) => void (g.startScene = scene.id))}
        >
          {isStart ? 'This is the start scene' : 'Make this the start scene'}
        </Button>
        <p className="text-xs text-muted-foreground">
          Draw click areas with the tools above the scene. Players never see an area, only its glow.
          Select an area to set what clicking it does.
        </p>
      </Section>
      <Section title="Cause and effect">
        <EventsEditor events={scene.events} attach="scene" onChange={eventsOf(edit, (s) => s)} />
      </Section>
      <ImagePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(r) => void setBackground(r)}
        title="Scene background"
      />
    </>
  )
}

function naturalSize(url: string) {
  return new Promise<{ w: number; h: number } | null>((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = url
  })
}

/** Area paths as a Vector Maker drawing, and back. */
export function areaDoc(scene: Pick<PictureScene, 'width' | 'height'>, paths: SubPath[]) {
  const doc = newDoc(scene.width, scene.height)
  doc.layers = [newLayer('Click area')]
  if (paths.length)
    doc.layers[0].items.push(
      newPath('Area', structuredClone(paths), {
        fill: '#ffd27a',
        stroke: '#1f1f24',
        strokeWidth: 2,
        opacity: 0.5,
        lineJoin: 'round',
        lineCap: 'round',
      }),
    )
  return doc
}

export function areaPaths(doc: VectorDoc): SubPath[] {
  return allItems(doc)
    .filter(({ layer, item }) => layer.visible && !item.hidden)
    .flatMap(({ item }) => item.subpaths)
    .filter((sp) => sp.anchors.length >= 2)
}

function AreaProps({
  scene,
  area,
  edit,
}: {
  scene: PictureScene
  area: ClickArea
  edit: EditScene
}) {
  const editArea = (recipe: (a: ClickArea) => void, key?: string) =>
    edit((s) => {
      const a = s.areas.find((x) => x.id === area.id)
      if (a) recipe(a)
    }, key)
  const setGlow = (patch: Partial<Glow>, key?: string) =>
    editArea((a) => void Object.assign(a.glow, patch), key && `${key}:${area.id}`)
  const openVector = async () => {
    const url = scene.background ? await imageUrl(scene.background) : null
    openShapeEditor({
      title: area.name,
      doc: areaDoc(scene, area.paths),
      reference: url ? { url, width: scene.width, height: scene.height } : undefined,
      onDone: (doc) => {
        const paths = areaPaths(doc)
        if (paths.length) editArea((a) => void (a.paths = paths))
      },
    })
  }
  const g = area.glow
  return (
    <>
      <Section
        title="Click area"
        action={
          <IconButton
            label="Delete area"
            onClick={() => {
              edit((s) => void (s.areas = s.areas.filter((a) => a.id !== area.id)))
              useGame.getState().select(null)
            }}
          >
            <Trash2 />
          </IconButton>
        }
      >
        <NameField
          value={area.name}
          onChange={(v) => editArea((a) => void (a.name = v), `name:${area.id}`)}
        />
        <Button variant="outline" onClick={() => void openVector()}>
          <PenTool /> Edit shape in Vector Maker…
        </Button>
        <p className="text-xs text-muted-foreground">
          Use the pen, shapes and combine tools over the scene picture. Done brings the shape back
          here.
        </p>
      </Section>
      <Section title="Glow">
        <Row>
          <div className="flex flex-col gap-1">
            <Label htmlFor="glow-what">Glow</Label>
            <NativeSelect
              id="glow-what"
              value={g.what}
              onChange={(e) => setGlow({ what: e.target.value as Glow['what'] })}
            >
              <option value="edge">Edges</option>
              <option value="fill">Whole shape</option>
              <option value="none">No glow</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="glow-when">When</Label>
            <NativeSelect
              id="glow-when"
              value={g.when}
              disabled={g.what === 'none'}
              onChange={(e) => setGlow({ when: e.target.value as Glow['when'] })}
            >
              <option value="hover">Pointer over it</option>
              <option value="click">Pressed</option>
              <option value="both">Both</option>
            </NativeSelect>
          </div>
        </Row>
        <ColorField
          label="Colour"
          value={g.color}
          onChange={(c) => c && setGlow({ color: c }, 'gc')}
        />
        <SliderField
          label="Strength"
          value={Math.round(g.strength * 100)}
          max={100}
          suffix="%"
          onChange={(v) => setGlow({ strength: v / 100 }, 'gs')}
        />
        <SliderField
          label="Softness"
          value={g.softness}
          max={60}
          suffix=" px"
          onChange={(v) => setGlow({ softness: v }, 'gf')}
        />
        <GlowPreview area={area} />
      </Section>
      <Section title="Cause and effect">
        <EventsEditor
          events={area.events}
          attach="area"
          onChange={eventsOf(edit, (s) => s.areas.find((a) => a.id === area.id))}
        />
      </Section>
    </>
  )
}

function SliderField({
  label,
  value,
  max,
  suffix,
  onChange,
}: {
  label: string
  value: number
  max: number
  suffix: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <Label>{label}</Label>
        <span className="text-muted-foreground tabular-nums">
          {value}
          {suffix}
        </span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={0}
        max={max}
        step={1}
        onValueChange={([v]) => onChange(v)}
        onValueCommit={() => useGame.getState().endStroke()}
      />
    </div>
  )
}

/** A small swatch of the glow as the player sees it. */
function GlowPreview({ area }: { area: ClickArea }) {
  const g = area.glow
  if (g.what === 'none') return null
  const blur = Math.max(1, g.softness / 3)
  return (
    <div className="grid h-16 place-items-center rounded-md bg-[#2a2a30]" aria-hidden>
      <div
        className="h-8 w-24 rounded"
        style={{
          opacity: g.strength,
          border: `2px solid ${g.color}`,
          background: g.what === 'fill' ? `${g.color}8c` : 'transparent',
          boxShadow: `0 0 ${blur * 2}px ${blur / 2}px ${g.color}`,
        }}
      />
    </div>
  )
}

const KIND_LABEL: Record<SceneObject['kind'], string> = {
  spot: 'Character spot',
  card: 'Card',
  image: 'Picture',
}

function ObjectProps({ obj, edit }: { obj: SceneObject; edit: EditScene }) {
  const [picking, setPicking] = useState(false)
  const cards = useGameCards((s) => s.merged?.pack.info.cards ?? [])
  const editObj = (recipe: (o: SceneObject) => void, key?: string) =>
    edit(
      (s) => {
        const o = s.objects.find((x) => x.id === obj.id)
        if (o) recipe(o)
      },
      key && `${key}:${obj.id}`,
    )
  return (
    <>
      <Section
        title={KIND_LABEL[obj.kind]}
        action={
          <div className="flex">
            <IconButton
              label={obj.visible ? 'Hidden at the start' : 'Shown at the start'}
              onClick={() => editObj((o) => void (o.visible = !o.visible))}
            >
              {obj.visible ? <Eye /> : <EyeOff />}
            </IconButton>
            <IconButton
              label="Delete"
              onClick={() => {
                edit((s) => void (s.objects = s.objects.filter((o) => o.id !== obj.id)))
                useGame.getState().select(null)
              }}
            >
              <Trash2 />
            </IconButton>
          </div>
        }
      >
        <NameField value={obj.name} onChange={(v) => editObj((o) => void (o.name = v), 'name')} />
        {obj.kind === 'card' ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor="obj-card">Card</Label>
            <NativeSelect
              id="obj-card"
              value={obj.cardId ?? ''}
              onChange={(e) => editObj((o) => void (o.cardId = e.target.value || undefined))}
            >
              <option value="">
                {cards.length ? 'Choose a card…' : 'No cards: add a card source'}
              </option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {obj.image && <Thumb image={obj.image} className="size-14" />}
            <Button size="sm" variant="outline" onClick={() => setPicking(true)}>
              <ImageIcon /> {obj.image ? 'Change picture…' : 'Choose picture…'}
            </Button>
            {obj.image && (
              <IconButton
                label="Remove picture"
                onClick={() => editObj((o) => void delete o.image)}
              >
                <X />
              </IconButton>
            )}
          </div>
        )}
        <Row cols={2}>
          {(['x', 'y', 'w', 'h'] as const).map((k) => (
            <NumberField
              key={k}
              label={{ x: 'X', y: 'Y', w: 'Width', h: 'Height' }[k]}
              value={obj[k]}
              step={1}
              precision={0}
              min={k === 'w' || k === 'h' ? 4 : undefined}
              onChange={(v) => editObj((o) => void (o[k] = Math.round(v)), k)}
            />
          ))}
        </Row>
        {!obj.visible && (
          <p className="text-xs text-muted-foreground">
            Hidden when the scene starts. Show it with the effect “Show or hide”.
          </p>
        )}
      </Section>
      <Section title="Cause and effect">
        <EventsEditor
          events={obj.events}
          attach="object"
          onChange={eventsOf(edit, (s) => s.objects.find((o) => o.id === obj.id))}
        />
      </Section>
      <ImagePicker
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(r) => editObj((o) => void (o.image = r))}
      />
    </>
  )
}
