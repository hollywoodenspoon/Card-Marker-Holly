import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpToLine,
  Combine,
  Copy,
  SquaresExclude,
  SquaresIntersect,
  SquaresSubtract,
  SquaresUnite,
  Trash2,
  Ungroup,
  Scissors,
} from 'lucide-react'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { ColorField, NumberField, Row, Section } from '@/ui/components/fields'
import {
  align,
  arrange,
  deleteSelection,
  duplicateSelection,
  makeCompound,
  moveToLayer,
  pathfinder,
  releaseCompound,
  reverseSelection,
  selectedItems,
  selectionBounds,
  setArtboard,
  setSelectionBox,
  setShapeParam,
  setStyle,
} from '../actions'
import { findItem } from '../model'
import { shapeById } from '../shapes'
import { useVector, vcommit } from '../store'

/** Properties of the selection, or of the artboard when nothing is selected. */
export function PropsPanel() {
  const doc = useVector((s) => s.doc)
  const selection = useVector((s) => s.selection)
  const anchors = useVector((s) => s.anchors)
  const snap = useVector((s) => s.snap)
  const pixelGrid = useVector((s) => s.pixelGrid)
  const breakHandles = useVector((s) => s.breakHandles)
  const tool = useVector((s) => s.tool)
  void doc // re-render on document changes
  const items = selectedItems()
  const first = items[items.length - 1]
  const box = selectionBounds(items)

  const toggles = (
    <Section title="Snapping">
      <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={snap}
          onChange={(e) => useVector.setState({ snap: e.target.checked })}
        />
        Snap to artboard and points
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
        <input
          type="checkbox"
          className="size-4 accent-accent"
          checked={pixelGrid}
          onChange={(e) => useVector.setState({ pixelGrid: e.target.checked })}
        />
        Snap to whole pixels
      </label>
      {(tool === 'pen' || tool === 'direct') && (
        <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
          <input
            type="checkbox"
            className="size-4 accent-accent"
            checked={breakHandles}
            onChange={(e) => useVector.setState({ breakHandles: e.target.checked })}
          />
          Break handles (like holding Alt)
        </label>
      )}
    </Section>
  )

  if (!first || !box)
    return (
      <div>
        <Section title="Artboard">
          <Row>
            <NumberField
              label="Width"
              unit="px"
              min={1}
              max={8192}
              step={1}
              precision={0}
              value={doc.width}
              onChange={(v) => setArtboard(v, doc.height)}
            />
            <NumberField
              label="Height"
              unit="px"
              min={1}
              max={8192}
              step={1}
              precision={0}
              value={doc.height}
              onChange={(v) => setArtboard(doc.width, v)}
            />
          </Row>
          <div className="flex flex-wrap gap-1.5">
            {[256, 512, 1024].map((n) => (
              <Button key={n} size="sm" variant="outline" onClick={() => setArtboard(n, n)}>
                {n} × {n}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Pick a tool on the left: the Pen draws your own shapes (click for corners, drag for
            curves, click the first point to close), Shapes adds ready-made ones.
          </p>
        </Section>
        {toggles}
      </div>
    )

  const def = items.length === 1 && first.shape ? shapeById(first.shape.id) : undefined
  const layers = [...doc.layers].reverse()
  const anchorRef = anchors.length === 1 ? anchors[0] : null
  const anchor = anchorRef
    ? findItem(doc, anchorRef.pathId)?.item.subpaths[anchorRef.sub]?.anchors[anchorRef.index]
    : undefined

  return (
    <div>
      <Section title={items.length === 1 ? first.name : `${items.length} objects`}>
        <Row>
          <ColorField
            label="Fill"
            value={first.style.fill}
            allowNone
            onChange={(v) => setStyle({ fill: v }, 'fill')}
          />
          <ColorField
            label="Stroke"
            value={first.style.stroke}
            allowNone
            onChange={(v) => setStyle({ stroke: v }, 'stroke')}
          />
        </Row>
        <Row>
          <NumberField
            label="Stroke width"
            unit="px"
            min={0}
            max={200}
            step={0.5}
            value={first.style.strokeWidth}
            onChange={(v) => setStyle({ strokeWidth: v }, 'sw')}
          />
          <NumberField
            label="Opacity"
            unit="%"
            min={0}
            max={100}
            step={1}
            precision={0}
            value={first.style.opacity * 100}
            onChange={(v) => setStyle({ opacity: v / 100 }, 'op')}
          />
        </Row>
        <Row>
          <div className="flex flex-col gap-1">
            <Label htmlFor="v-join">Corners</Label>
            <NativeSelect
              id="v-join"
              value={first.style.lineJoin ?? 'round'}
              onChange={(e) => setStyle({ lineJoin: e.target.value as 'round' })}
            >
              <option value="miter">Sharp</option>
              <option value="round">Round</option>
              <option value="bevel">Bevel</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="v-cap">Line ends</Label>
            <NativeSelect
              id="v-cap"
              value={first.style.lineCap ?? 'round'}
              onChange={(e) => setStyle({ lineCap: e.target.value as 'round' })}
            >
              <option value="butt">Flat</option>
              <option value="round">Round</option>
              <option value="square">Square</option>
            </NativeSelect>
          </div>
        </Row>
      </Section>
      <Section title="Position and size">
        <Row>
          <NumberField
            label="X"
            unit="px"
            step={1}
            value={box.x}
            onChange={(x) => setSelectionBox({ x })}
          />
          <NumberField
            label="Y"
            unit="px"
            step={1}
            value={box.y}
            onChange={(y) => setSelectionBox({ y })}
          />
        </Row>
        <Row>
          <NumberField
            label="W"
            unit="px"
            min={0.1}
            step={1}
            value={box.w}
            onChange={(w) => setSelectionBox({ w })}
          />
          <NumberField
            label="H"
            unit="px"
            min={0.1}
            step={1}
            value={box.h}
            onChange={(h) => setSelectionBox({ h })}
          />
        </Row>
        {anchor && anchorRef && (
          <Row>
            <NumberField
              label="Point X"
              unit="px"
              step={1}
              value={anchor.x}
              onChange={(x) =>
                vcommit((d) => {
                  const a = findItem(d, anchorRef.pathId)?.item.subpaths[anchorRef.sub]?.anchors[
                    anchorRef.index
                  ]
                  if (a) a.x = x
                }, 'ax')
              }
            />
            <NumberField
              label="Point Y"
              unit="px"
              step={1}
              value={anchor.y}
              onChange={(y) =>
                vcommit((d) => {
                  const a = findItem(d, anchorRef.pathId)?.item.subpaths[anchorRef.sub]?.anchors[
                    anchorRef.index
                  ]
                  if (a) a.y = y
                }, 'ay')
              }
            />
          </Row>
        )}
      </Section>
      {def?.params && first.shape && (
        <Section title={def.label}>
          {def.params.map((p) => (
            <NumberField
              key={p.key}
              label={p.label}
              min={p.min}
              max={p.max}
              step={p.step}
              precision={p.step < 1 ? 2 : 0}
              value={first.shape!.params[p.key] ?? p.value}
              onChange={(v) => setShapeParam(first.id, p.key, Math.max(p.min, Math.min(p.max, v)))}
            />
          ))}
          <p className="text-xs text-muted-foreground">
            Editing its points turns it into an ordinary path.
          </p>
        </Section>
      )}
      {items.length >= 2 && (
        <Section title="Combine shapes">
          <div className="grid grid-cols-5 gap-1">
            <IconButton
              label="Unite (merge)"
              variant="outline"
              onClick={() => void pathfinder('unite')}
            >
              <SquaresUnite />
            </IconButton>
            <IconButton
              label="Minus front (cut)"
              variant="outline"
              onClick={() => void pathfinder('minus')}
            >
              <SquaresSubtract />
            </IconButton>
            <IconButton
              label="Intersect"
              variant="outline"
              onClick={() => void pathfinder('intersect')}
            >
              <SquaresIntersect />
            </IconButton>
            <IconButton
              label="Exclude"
              variant="outline"
              onClick={() => void pathfinder('exclude')}
            >
              <SquaresExclude />
            </IconButton>
            <IconButton label="Divide" variant="outline" onClick={() => void pathfinder('divide')}>
              <Scissors />
            </IconButton>
          </div>
          <p className="text-xs text-muted-foreground">
            Minus front cuts the top shapes out of the bottom one. Divide splits everything where
            outlines cross.
          </p>
        </Section>
      )}
      <Section title="Arrange and align">
        <div className="grid grid-cols-4 gap-1">
          <IconButton label="Bring to front" variant="outline" onClick={() => arrange('front')}>
            <ArrowUpToLine />
          </IconButton>
          <IconButton label="Bring forward" variant="outline" onClick={() => arrange('forward')}>
            <ArrowUp />
          </IconButton>
          <IconButton label="Send backward" variant="outline" onClick={() => arrange('backward')}>
            <ArrowDown />
          </IconButton>
          <IconButton label="Send to back" variant="outline" onClick={() => arrange('back')}>
            <ArrowDownToLine />
          </IconButton>
        </div>
        <div className="grid grid-cols-6 gap-1">
          <IconButton label="Align left" variant="outline" onClick={() => align('left')}>
            <AlignStartVertical />
          </IconButton>
          <IconButton label="Align centre" variant="outline" onClick={() => align('hcenter')}>
            <AlignCenterVertical />
          </IconButton>
          <IconButton label="Align right" variant="outline" onClick={() => align('right')}>
            <AlignEndVertical />
          </IconButton>
          <IconButton label="Align top" variant="outline" onClick={() => align('top')}>
            <AlignStartHorizontal />
          </IconButton>
          <IconButton label="Align middle" variant="outline" onClick={() => align('vcenter')}>
            <AlignCenterHorizontal />
          </IconButton>
          <IconButton label="Align bottom" variant="outline" onClick={() => align('bottom')}>
            <AlignEndHorizontal />
          </IconButton>
        </div>
        <p className="text-xs text-muted-foreground">
          {items.length === 1
            ? 'One object aligns to the artboard.'
            : 'Objects align to each other.'}
        </p>
        <div className="flex flex-col gap-1">
          <Label htmlFor="v-layer">Layer</Label>
          <NativeSelect
            id="v-layer"
            value={doc.layers.find((l) => l.items.some((i) => i.id === first.id))?.id}
            onChange={(e) => moveToLayer(e.target.value)}
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Section>
      <Section title="Path">
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={duplicateSelection}>
            <Copy /> Duplicate
          </Button>
          {items.length >= 2 && (
            <Button size="sm" variant="outline" onClick={makeCompound}>
              <Combine /> Compound path
            </Button>
          )}
          {items.some((i) => i.subpaths.length > 1) && (
            <Button size="sm" variant="outline" onClick={releaseCompound}>
              <Ungroup /> Release compound
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={reverseSelection}>
            <ArrowLeftRight /> Reverse direction
          </Button>
          <Button size="sm" variant="danger" onClick={deleteSelection}>
            <Trash2 /> Delete
          </Button>
        </div>
        <p className="text-xs text-muted-foreground" data-testid="v-sel-info">
          {selection.length} selected · {items.reduce((n, i) => n + i.subpaths.length, 0)} outline
          {items.reduce((n, i) => n + i.subpaths.length, 0) === 1 ? '' : 's'}
        </p>
      </Section>
      {toggles}
    </div>
  )
}
