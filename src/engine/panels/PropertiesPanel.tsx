import { Trash2 } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import {
  DIRS,
  type Dir,
  kindOf,
  type MapDoc,
  sideRef,
  tileAt,
  type TileKind,
  topRef,
} from '../model/map'
import { useEngine } from '../store/engineStore'
import {
  paintSide,
  paintTop,
  raise,
  removeOverhang,
  removeTile,
  setKind,
  setSlope,
  setType,
} from '../tools/edit'
import { TileSwatch } from './TilePicker'

const DIR_NAME: Record<Dir, string> = { n: 'North', e: 'East', s: 'South', w: 'West' }

/** The right panel: only what the selected thing can do (Canva-style). */
export function PropertiesPanel() {
  const sel = useEngine((s) => s.selection)
  const mode = useEngine((s) => s.mode)
  return (
    <aside className="h-full w-full overflow-y-auto p-3" aria-label="Properties">
      {sel?.overhang ? (
        <OverhangProps />
      ) : sel ? (
        <TileProps />
      ) : (
        <MapProps hint={mode === 'tile'} />
      )}
    </aside>
  )
}

function MapProps({ hint }: { hint: boolean }) {
  const map = useEngine((s) => s.map)
  const tiles = map.tiles.filter(Boolean).length
  return (
    <section className="space-y-2 text-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Map</h2>
      <Row k="Size" v={`${map.size.x} × ${map.size.z} tiles`} />
      <Row k="Tiles" v={String(tiles)} />
      <Row k="Bridges and arches" v={String(Object.keys(map.overhangs).length)} />
      <Row k="Game camera" v={`${map.camera.fov}° · view ${map.camera.yaw + 1} of 4`} />
      <p className="pt-2 text-xs text-muted-foreground">
        {hint ? 'Click a tile to inspect it.' : 'Press E (Tile) and click a tile to inspect it.'}
      </p>
    </section>
  )
}

function TileProps() {
  const sel = useEngine((s) => s.selection)!
  const map = useEngine((s) => s.map)
  const t = tileAt(map, sel.x, sel.z)
  const commit = (fn: (m: MapDoc) => void) => {
    useEngine.getState().commit(fn)
    useEngine.getState().endStroke()
  }
  if (!t)
    return (
      <section className="space-y-2 text-sm">
        <Heading>{`Tile ${sel.x}, ${sel.z}`}</Heading>
        <p className="text-muted-foreground">A hole: no ground here.</p>
        <Button
          size="sm"
          onClick={() => commit((m) => raise(m, sel.x, sel.z, 2, useEngine.getState().typeBrush))}
        >
          Fill with ground
        </Button>
      </section>
    )
  const kind = kindOf(map, t)
  const ts = (id: string) => map.tilesets.find((s) => s.id === id)
  const top = topRef(map, t)
  return (
    <section className="space-y-3 text-sm">
      <Heading>{`Tile ${sel.x}, ${sel.z}`}</Heading>

      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">Height</span>
        <div className="flex items-center gap-1">
          <IconButton
            label="Lower half a step"
            size="icon-sm"
            onClick={() => commit((m) => raise(m, sel.x, sel.z, -1, t.type))}
          >
            <span className="text-base leading-none">−</span>
          </IconButton>
          <span className="w-16 text-center tabular-nums">{t.h / 2} steps</span>
          <IconButton
            label="Raise half a step"
            size="icon-sm"
            onClick={() => commit((m) => raise(m, sel.x, sel.z, 1, t.type))}
          >
            <span className="text-base leading-none">+</span>
          </IconButton>
        </div>
      </div>

      <Field label="Kind">
        <NativeSelect
          value={kind}
          onChange={(e) => commit((m) => setKind(m, sel.x, sel.z, e.target.value as TileKind))}
        >
          <option value="ground">Ground</option>
          <option value="water">Water</option>
          <option value="blocked">Blocked</option>
        </NativeSelect>
      </Field>
      <Row k="Walkable" v={kind === 'ground' ? 'Yes' : 'No'} />

      <Field label="Slope">
        <NativeSelect
          value={t.slope ? `${t.slope.dir}${t.slope.rise}` : ''}
          onChange={(e) => {
            const v = e.target.value
            commit((m) =>
              setSlope(
                m,
                sel.x,
                sel.z,
                v ? { dir: v[0] as Dir, rise: Number(v[1]) as 1 | 2 } : undefined,
              ),
            )
          }}
        >
          <option value="">Flat</option>
          {DIRS.map((d) => (
            <optgroup key={d} label={`Rises toward ${DIR_NAME[d]}`}>
              <option value={`${d}1`}>{DIR_NAME[d]}, half a step</option>
              <option value={`${d}2`}>{DIR_NAME[d]}, one step</option>
            </optgroup>
          ))}
        </NativeSelect>
      </Field>

      <Field label="Terrain type">
        <NativeSelect
          value={t.type}
          onChange={(e) => commit((m) => setType(m, sel.x, sel.z, e.target.value))}
        >
          {map.tileTypes.map((tt) => (
            <option key={tt.id} value={tt.id}>
              {tt.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div>
        <div className="mb-1 text-xs text-muted-foreground">Faces</div>
        <ul className="space-y-1">
          <FaceRow
            label="Top"
            swatch={<TileSwatch tileset={ts(top.tileset)} tile={top} size={22} />}
            painted={!!t.top}
            onClear={() => commit((m) => paintTop(m, sel.x, sel.z, null))}
          />
          {DIRS.map((d) => {
            const r = sideRef(map, t, d)
            return (
              <FaceRow
                key={d}
                label={`${DIR_NAME[d]} side${r.auto ? ' (generated)' : ''}`}
                swatch={<TileSwatch tileset={ts(r.ref.tileset)} tile={r.ref} size={22} />}
                painted={!!t.sides?.[d]}
                onClear={() => commit((m) => paintSide(m, sel.x, sel.z, d, null))}
              />
            )
          })}
        </ul>
      </div>

      <div className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
        Causes and effects (what happens when someone steps here) come with the Cause and Effect
        system.
      </div>

      <Button
        variant="danger"
        size="sm"
        className="w-full"
        onClick={() => {
          commit((m) => removeTile(m, sel.x, sel.z))
          useEngine.getState().setSelection(null)
        }}
      >
        <Trash2 /> Make a hole
      </Button>
    </section>
  )
}

function OverhangProps() {
  const sel = useEngine((s) => s.selection)!
  const c = sel.overhang!
  const block = useEngine((s) => s.map.overhangs[`${c.x},${c.y},${c.z}`])
  const types = useEngine((s) => s.map.tileTypes)
  if (!block) return <p className="text-sm text-muted-foreground">This block is gone.</p>
  return (
    <section className="space-y-3 text-sm">
      <Heading>Bridge block</Heading>
      <Row k="Cell" v={`${c.x}, ${c.y}, ${c.z}`} />
      <Field label="Terrain type">
        <NativeSelect
          value={block.type}
          onChange={(e) => {
            const v = e.target.value
            useEngine.getState().commit((m) => {
              const b = m.overhangs[`${c.x},${c.y},${c.z}`]
              if (b) b.type = v
            })
          }}
        >
          {types.map((tt) => (
            <option key={tt.id} value={tt.id}>
              {tt.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <p className="text-xs text-muted-foreground">
        Bridges and arches are scenery for now; the rules don't see them yet.
      </p>
      <Button
        variant="danger"
        size="sm"
        className="w-full"
        onClick={() => {
          useEngine.getState().commit((m) => removeOverhang(m, c))
          useEngine.getState().setSelection(null)
        }}
      >
        <Trash2 /> Remove block
      </Button>
    </section>
  )
}

function FaceRow({
  label,
  swatch,
  painted,
  onClear,
}: {
  label: string
  swatch: React.ReactNode
  painted: boolean
  onClear: () => void
}) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {swatch}
      <span className="flex-1">{label}</span>
      {painted ? (
        <Button size="sm" variant="ghost" className="h-7 px-2 md:h-7" onClick={onClear}>
          Clear paint
        </Button>
      ) : (
        <span className="text-muted-foreground">default</span>
      )}
    </li>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
