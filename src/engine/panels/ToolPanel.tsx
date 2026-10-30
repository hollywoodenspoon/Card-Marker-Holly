import { useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Bridge,
  Brush,
  Droplet,
  Equal,
  ImagePlus,
  PaintBucket,
  Replace,
  Shovel,
  TrendingUp,
} from '@/ui/icons'
import { Button } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { cn } from '@/lib/cn'
import { type Dir, type TileType } from '../model/map'
import { TILE_SIZES, type TileSize } from '../model/tileset'
import {
  type PaintTarget,
  type PaintTool,
  type PaintWhat,
  type TerrainOp,
  useEngine,
} from '../store/engineStore'
import { importTileset, setTileSize, TilesetError } from '../storage/tilesetActions'
import { TilePicker, TileSwatch } from './TilePicker'

/** The left panel: the current mode's options, the tiles and terrain types. */
export function ToolPanel() {
  const mode = useEngine((s) => s.mode)
  return (
    <aside
      className="flex h-full w-full flex-col gap-4 overflow-y-auto p-3"
      aria-label="Tools"
    >
      {mode === 'terrain' && <TerrainOptions />}
      {mode === 'paint' && <PaintOptions />}
      {mode === 'tile' && (
        <Section title="Tile">
          <p className="text-sm text-muted-foreground">
            Click a tile to see what it is and change it in the right panel.
          </p>
        </Section>
      )}
      <p className="mt-auto text-xs text-muted-foreground">
        Right-drag to orbit, middle-drag to pan, scroll to zoom. Shift = half step, Alt = the
        opposite (or the eyedropper in Paint).
      </p>
    </aside>
  )
}

const TERRAIN_OPS: { id: TerrainOp; label: string; icon: typeof Brush; hint: string }[] = [
  {
    id: 'raise',
    label: 'Raise',
    icon: ArrowUp,
    hint: 'Click to raise a step (Shift: half a step, Alt: lower).',
  },
  {
    id: 'lower',
    label: 'Lower',
    icon: ArrowDown,
    hint: 'Click to lower a step (Shift: half a step, Alt: raise).',
  },
  {
    id: 'flatten',
    label: 'Flatten',
    icon: Equal,
    hint: 'Drag from a tile to level others to its height.',
  },
  {
    id: 'slope',
    label: 'Slope',
    icon: TrendingUp,
    hint: 'Make a ramp rising toward the chosen side (Alt: flat).',
  },
  {
    id: 'kind',
    label: 'Kind',
    icon: Droplet,
    hint: 'Make tiles water or blocked (Alt: ground again).',
  },
  { id: 'hole', label: 'Hole', icon: Shovel, hint: 'Remove tiles, leaving a hole.' },
  {
    id: 'overhang',
    label: 'Bridge',
    icon: Bridge,
    hint: 'Place floating blocks for bridges and arches (Alt: remove).',
  },
]

function TerrainOptions() {
  const o = useEngine((s) => s.terrain)
  const set = useEngine.getState().setTerrain
  return (
    <>
      <Section title="Terrain">
        <div className="grid grid-cols-2 gap-1.5">
          {TERRAIN_OPS.map((t) => (
            <Button
              key={t.id}
              variant="outline"
              size="sm"
              active={o.op === t.id}
              className="justify-start"
              onClick={() => set({ op: t.id })}
            >
              <t.icon /> {t.label}
            </Button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {TERRAIN_OPS.find((t) => t.id === o.op)?.hint}
        </p>
      </Section>
      {o.op !== 'overhang' && <BrushSize value={o.size} onChange={(size) => set({ size })} />}
      {o.op === 'slope' && (
        <Section title="Slope">
          <Seg
            label="Rises toward"
            value={o.slopeDir}
            options={[
              ['n', 'North'],
              ['e', 'East'],
              ['s', 'South'],
              ['w', 'West'],
            ]}
            onChange={(slopeDir) => set({ slopeDir: slopeDir as Dir })}
          />
          <Seg
            label="Rise"
            value={String(o.rise)}
            options={[
              ['1', 'Half step'],
              ['2', 'One step'],
            ]}
            onChange={(r) => set({ rise: Number(r) as 1 | 2 })}
          />
        </Section>
      )}
      {o.op === 'kind' && (
        <Section title="Kind">
          <Seg
            label="Make tiles"
            value={o.kind}
            options={[
              ['water', 'Water'],
              ['blocked', 'Blocked'],
              ['ground', 'Ground'],
            ]}
            onChange={(kind) => set({ kind: kind as 'water' | 'blocked' | 'ground' })}
          />
        </Section>
      )}
      <TypeList title={o.op === 'overhang' ? 'Block type' : 'New tiles use'} />
    </>
  )
}

function PaintOptions() {
  const o = useEngine((s) => s.paint)
  const set = useEngine.getState().setPaint
  return (
    <>
      <Section title="Paint">
        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              ['brush', 'Brush', Brush],
              ['fill', 'Fill', PaintBucket],
              ['replace', 'Replace all', Replace],
            ] as [PaintTool, string, typeof Brush][]
          ).map(([id, label, Icon]) => (
            <Button
              key={id}
              size="sm"
              variant="outline"
              active={o.tool === id}
              onClick={() => set({ tool: id })}
              title={label}
            >
              <Icon /> <span className="truncate">{label}</span>
            </Button>
          ))}
        </div>
        <Seg
          label="Faces"
          value={o.target}
          options={[
            ['tops', 'Tops'],
            ['sides', 'Sides'],
            ['both', 'Both'],
          ]}
          onChange={(target) => set({ target: target as PaintTarget })}
        />
        <Seg
          label="Paint"
          value={o.what}
          options={[
            ['tile', 'A tile'],
            ['type', 'Terrain type'],
            ['clear', 'Clear'],
          ]}
          onChange={(what) => set({ what: what as PaintWhat })}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          {o.what === 'clear'
            ? 'Removes painted tiles, back to the terrain type’s own.'
            : o.tool === 'fill'
              ? 'Fills connected tiles that show the same top.'
              : o.tool === 'replace'
                ? 'Changes every tile in the map that shows the same top.'
                : o.target === 'sides'
                  ? 'Click a side to paint just that face.'
                  : 'Click or drag over tiles.'}{' '}
          Alt-click picks up a tile.
        </p>
      </Section>
      {o.tool === 'brush' && <BrushSize value={o.size} onChange={(size) => set({ size })} />}
      {o.what === 'tile' && <Tiles />}
      {o.what === 'type' && <TypeList title="Terrain type" />}
      <TypeEditor />
    </>
  )
}

/** Tileset picker, tile grid, import, and the tile size of imported tilesets. */
function Tiles() {
  const tilesets = useEngine((s) => s.map.tilesets)
  const brush = useEngine((s) => s.tileBrush)
  const [shown, setShown] = useState(brush.tileset)
  const [size, setSize] = useState<TileSize>(16)
  const [error, setError] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const ts = tilesets.find((t) => t.id === shown) ?? tilesets[0]
  return (
    <Section title="Tiles">
      <div className="flex gap-1.5">
        <NativeSelect aria-label="Tileset" value={ts.id} onChange={(e) => setShown(e.target.value)}>
          {tilesets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.tileSize} px)
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="mt-2">
        <TilePicker
          tileset={ts}
          value={brush}
          onPick={(r) => useEngine.getState().setTileBrush(r)}
        />
      </div>
      {ts.assetId && (
        <label className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Tile size</span>
          <NativeSelect
            className="w-24"
            value={ts.tileSize}
            onChange={(e) => setTileSize(ts.id, Number(e.target.value) as TileSize)}
          >
            {TILE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} px
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      <div className="mt-3 flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => file.current?.click()}
        >
          <ImagePlus /> Import tileset
        </Button>
        <NativeSelect
          aria-label="Tile size for the import"
          className="w-20"
          value={size}
          onChange={(e) => setSize(Number(e.target.value) as TileSize)}
        >
          {TILE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} px
            </option>
          ))}
        </NativeSelect>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        A PNG grid of tiles, e.g. Aseprite's sprite sheet export.
      </p>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <input
        ref={file}
        type="file"
        accept="image/png,image/webp,image/gif,image/jpeg"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          try {
            setError('')
            setShown(await importTileset(f, size))
          } catch (err) {
            setError(err instanceof TilesetError ? err.message : String(err))
          }
        }}
      />
    </Section>
  )
}

/** The terrain types, each shown by its top tile; clicking one picks it. */
function TypeList({ title }: { title: string }) {
  const types = useEngine((s) => s.map.tileTypes)
  const tilesets = useEngine((s) => s.map.tilesets)
  const brush = useEngine((s) => s.typeBrush)
  return (
    <Section title={title}>
      <div className="grid grid-cols-3 gap-1.5">
        {types.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={brush === t.id}
            onClick={() => useEngine.getState().setTypeBrush(t.id)}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md border-2 p-1 text-[11px]',
              brush === t.id ? 'border-accent' : 'border-transparent hover:bg-muted',
            )}
          >
            <TileSwatch
              tileset={tilesets.find((s) => s.id === t.top.tileset)}
              tile={t.top}
              size={30}
            />
            <span className="w-full truncate text-center">{t.name}</span>
          </button>
        ))}
      </div>
    </Section>
  )
}

/** Set the picked terrain type's default faces from the picked tile. */
function TypeEditor() {
  const typeId = useEngine((s) => s.typeBrush)
  const type = useEngine((s) => s.map.tileTypes.find((t) => t.id === typeId))
  const tilesets = useEngine((s) => s.map.tilesets)
  if (!type) return null
  const edit = (fn: (t: TileType) => void) =>
    useEngine.getState().commit((m) => {
      const t = m.tileTypes.find((x) => x.id === typeId)
      if (t) fn(t)
    })
  const brush = () => ({ ...useEngine.getState().tileBrush })
  const faces: [keyof Pick<TileType, 'top' | 'side' | 'sideLower' | 'bottom'>, string][] = [
    ['top', 'Top'],
    ['side', 'Side (top band)'],
    ['sideLower', 'Side (below)'],
    ['bottom', 'Bottom'],
  ]
  return (
    <Section title={`${type.name}'s faces`}>
      <ul className="space-y-1">
        {faces.map(([k, label]) => {
          const r = type[k] ?? type.side
          return (
            <li key={k} className="flex items-center gap-2 text-xs">
              <TileSwatch tileset={tilesets.find((s) => s.id === r.tileset)} tile={r} size={22} />
              <span className="flex-1">{label}</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 md:h-7"
                onClick={() => edit((t) => (t[k] = brush()))}
              >
                Use picked tile
              </Button>
            </li>
          )
        })}
      </ul>
      <Seg
        label="Sides"
        value={type.sideMode}
        options={[
          ['drawn', 'Drawn'],
          ['auto', 'Generated'],
        ]}
        onChange={(v) => edit((t) => (t.sideMode = v as 'drawn' | 'auto'))}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Generated sides are a draft made from the top tile's edge.
      </p>
    </Section>
  )
}

function BrushSize({ value, onChange }: { value: 1 | 3 | 5; onChange: (v: 1 | 3 | 5) => void }) {
  return (
    <Seg
      label="Brush"
      value={String(value)}
      options={[
        ['1', '1 tile'],
        ['3', '3 × 3'],
        ['5', '5 × 5'],
      ]}
      onChange={(v) => onChange(Number(v) as 1 | 3 | 5)}
    />
  )
}

function Seg({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: [string, string][]
  onChange: (v: string) => void
}) {
  return (
    <div className="mt-2" role="radiogroup" aria-label={label}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex rounded-md border p-0.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              'min-h-8 flex-1 rounded px-1.5 text-xs',
              value === v ? 'bg-accent-soft font-medium text-accent' : 'hover:bg-muted',
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  )
}
