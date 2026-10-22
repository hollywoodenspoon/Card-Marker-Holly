import {
  LayoutTemplate,
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Lock,
  LockOpen,
  Rows3,
  Shapes,
  Type,
} from '@/ui/icons'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditor } from '@/core/editor/editorStore'
import { moveCardLayerTo, moveElementTo, select } from '@/core/editor/elementCommands'
import {
  activeTemplate,
  currentCard,
  isLayoutEditable,
  localElements,
} from '@/core/editor/selectors'
import { mergeLayers } from '@/core/model/layering'
import type { Element } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { toggleEditLock, toggleVisibility, renameElement } from '@/templates/commands'
import { isVisibleOnCard, lockedVisibility } from '@/templates/resolve'
import { cachedDefaults, describeRule } from '@/templates/rules'
import { IconButton } from '@/ui/components/ui/button'
import { Tip } from '@/ui/components/fields'
import { useReorder } from '@/ui/components/useReorder'

export function LayersPanel({ embedded }: { embedded?: boolean }) {
  const mode = useEditor((s) => s.view.mode)
  const template = useEditor(activeTemplate)
  const local = useEditor(useShallow(localElements))
  return (
    <div className={cn('min-h-0 flex-1 overflow-auto', embedded ? 'pb-2' : 'pb-4')}>
      {!embedded && (
        <Heading>
          {mode === 'card'
            ? `Layers · ${template?.name ?? 'no template'}`
            : (template?.name ?? 'Template')}
        </Heading>
      )}
      {mode === 'card' ? (
        template?.elements.length || local.length ? (
          <CardLayerList templateEls={template?.elements ?? []} local={local} />
        ) : (
          <Empty />
        )
      ) : template?.elements.length ? (
        <LayerList elements={template.elements} depth={0} />
      ) : (
        <Empty />
      )}
      {mode === 'card' && (
        <Tip id="card-layers">
          Drag this card's own layers anywhere, also between template parts. The eye hides a
          template part on this card only; other parts stay where they are.
        </Tip>
      )}
    </div>
  )
}

const Empty = () => (
  <p className="px-4 py-2 text-sm text-muted-foreground">
    No layers yet. Use <b>Add</b> in the top bar for text, an image or a shape.
  </p>
)

/** Card mode: template parts and this card's elements in one stacking order. */
function CardLayerList({ templateEls, local }: { templateEls: Element[]; local: Element[] }) {
  const display = [...mergeLayers(templateEls, local)].reverse()
  const { handleProps, rowRef, dragging } = useReorder((from, to) => {
    const l = display[from]
    if (l.source === 'card') moveCardLayerTo(l.el.id, display.length - 1 - to)
  })
  return (
    <ul>
      {display.map((l, i) => (
        <li key={l.el.id} ref={rowRef(i)}>
          {dragging && dragging.over === i && dragging.from !== i && <DropLine depth={0} />}
          <LayerRow
            el={l.el}
            depth={0}
            handle={handleProps(i)}
            dragged={dragging?.from === i}
            fromTemplate={l.source === 'template'}
          />
          {dragging && i === display.length - 1 && dragging.over === display.length && (
            <DropLine depth={0} />
          )}
        </li>
      ))}
    </ul>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </div>
  )
}

function LayerList({ elements, depth }: { elements: Element[]; depth: number }) {
  const display = [...elements].reverse()
  const { handleProps, rowRef, dragging } = useReorder((from, to) => {
    const el = display[from]
    moveElementTo(el.id, elements.length - 1 - to)
  })
  return (
    <ul>
      {display.map((el, i) => (
        <li key={el.id} ref={rowRef(i)}>
          {dragging && dragging.over === i && dragging.from !== i && <DropLine depth={depth} />}
          <LayerRow el={el} depth={depth} handle={handleProps(i)} dragged={dragging?.from === i} />
          {dragging && i === display.length - 1 && dragging.over === display.length && (
            <DropLine depth={depth} />
          )}
        </li>
      ))}
    </ul>
  )
}

const DropLine = ({ depth }: { depth: number }) => (
  <div
    className="h-0.5 rounded bg-accent"
    style={{ marginLeft: 16 + depth * 16, marginRight: 8 }}
  />
)

const ICONS = {
  text: Type,
  imageField: ImagePlus,
  image: ImageIcon,
  shape: Shapes,
  group: Folder,
  iconRow: Rows3,
}

function LayerRow({
  el,
  depth,
  handle,
  dragged,
  fromTemplate,
}: {
  el: Element
  depth: number
  /** Card mode: this row is a template part (fixed in the stack). */
  fromTemplate?: boolean
  handle: ReturnType<ReturnType<typeof useReorder>['handleProps']>
  dragged: boolean
}) {
  const selected = useEditor((s) => s.view.selection.includes(el.id))
  const mode = useEditor((s) => s.view.mode)
  const editable = useEditor((s) => isLayoutEditable(s, el.id))
  const visible = useEditor((s) => {
    if (s.view.mode === 'card' && !editable)
      return isVisibleOnCard(el, currentCard(s), cachedDefaults(activeTemplate(s)))
    return el.defaultVisible
  })
  const [open, setOpen] = useState(true)
  const [renaming, setRenaming] = useState(false)
  const Icon = ICONS[el.type]
  const canToggle = mode === 'template' || editable || !el.toggleLocked
  const isField = el.type === 'text' || el.type === 'imageField'

  return (
    <>
      <div
        className={cn(
          'mx-2 flex h-11 items-center gap-1 rounded-lg pr-1 md:h-9',
          selected ? 'bg-accent-soft' : 'hover:bg-muted',
          dragged && 'opacity-50',
          !visible && 'text-muted-foreground',
        )}
        style={{ paddingLeft: 4 + depth * 16 }}
      >
        {editable ? (
          <span
            {...handle}
            aria-label={`Drag to reorder ${el.name}`}
            role="button"
            className="grid h-full w-8 shrink-0 place-items-center text-muted-foreground md:w-6"
          >
            <GripVertical className="size-3.5" />
          </span>
        ) : (
          <span className="w-8 shrink-0 md:w-6" />
        )}
        {el.type === 'group' ? (
          <button
            type="button"
            aria-label={open ? 'Collapse group' : 'Expand group'}
            onClick={() => setOpen(!open)}
            className="grid size-11 shrink-0 place-items-center md:size-6"
          >
            <ChevronRight className={cn('size-3.5 transition-transform', open && 'rotate-90')} />
          </button>
        ) : null}
        <button
          type="button"
          className="flex h-full min-w-0 flex-1 items-center gap-2 text-left"
          onClick={(e) => {
            const s = useEditor.getState().view.selection
            if (e.shiftKey || e.metaKey || e.ctrlKey)
              select(s.includes(el.id) ? s.filter((x) => x !== el.id) : [...s, el.id])
            else select([el.id])
          }}
          onDoubleClick={() => editable && setRenaming(true)}
        >
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          {renaming ? (
            <input
              autoFocus
              defaultValue={el.name}
              aria-label="Layer name"
              className="h-7 min-w-0 flex-1 rounded border border-accent bg-panel px-1.5 text-sm outline-none"
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v && v !== el.name) renameElement(el.id, v)
                setRenaming(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur()
                if (e.key === 'Escape') setRenaming(false)
              }}
            />
          ) : (
            <span className="truncate text-sm">
              {el.name}
              {isField && <span className="ml-1.5 text-[10px] text-accent uppercase">field</span>}
              {el.showIf && (
                <span
                  className="ml-1.5 rounded bg-muted px-1 text-[10px] font-semibold text-muted-foreground"
                  title={`Shown only when ${describeRule(el.showIf)}`}
                >
                  if
                </span>
              )}
              {'mergeColumn' in el && el.mergeColumn && (
                <span
                  className="ml-1.5 rounded bg-accent-soft px-1 text-[10px] font-semibold text-accent"
                  title={`Spreadsheet column ${el.mergeColumn}`}
                >
                  {el.mergeColumn}
                </span>
              )}
              {fromTemplate && (
                <LayoutTemplate
                  className="ml-1.5 inline size-3 align-[-1px] text-muted-foreground"
                  aria-label="From the template"
                />
              )}
            </span>
          )}
        </button>
        {canToggle ? (
          <IconButton
            label={visible ? `Hide ${el.name}` : `Show ${el.name}`}
            size="icon-sm"
            onClick={() => toggleVisibility(el.id)}
          >
            {visible ? <Eye /> : <EyeOff />}
          </IconButton>
        ) : (
          // A disabled button can't show a tooltip, and touch has none: say it plainly.
          <span
            className="flex h-11 shrink-0 items-center justify-center gap-0.5 px-1 text-muted-foreground/50 md:h-8"
            title={lockedVisibility(el, visible)}
            aria-label={`${el.name}: ${lockedVisibility(el, visible)}`}
          >
            {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            <Lock className="size-3" />
          </span>
        )}
        {editable && (
          <IconButton
            label={el.editLocked ? `Unlock ${el.name}` : `Lock ${el.name}`}
            size="icon-sm"
            onClick={() => toggleEditLock(el.id)}
            className={cn(!el.editLocked && 'text-muted-foreground')}
          >
            {el.editLocked ? <Lock /> : <LockOpen />}
          </IconButton>
        )}
      </div>
      {el.type === 'group' && open && <LayerList elements={el.children} depth={depth + 1} />}
    </>
  )
}
