import {
  ChevronRight,
  Eye,
  EyeOff,
  Folder,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  Lock,
  LockOpen,
  Shapes,
  Type,
} from 'lucide-react'
import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEditor } from '@/core/editor/editorStore'
import { moveElementTo, select } from '@/core/editor/elementCommands'
import {
  activeTemplate,
  currentCard,
  isLayoutEditable,
  localElements,
} from '@/core/editor/selectors'
import type { Element } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { toggleEditLock, toggleVisibility, renameElement } from '@/templates/commands'
import { isVisibleOnCard } from '@/templates/resolve'
import { IconButton } from '@/ui/components/ui/button'
import { useReorder } from '@/ui/components/useReorder'

export function LayersPanel() {
  const mode = useEditor((s) => s.view.mode)
  const template = useEditor(activeTemplate)
  const local = useEditor(useShallow(localElements))
  return (
    <div className="min-h-0 flex-1 overflow-auto pb-4">
      {mode === 'card' && local.length > 0 && (
        <>
          <Heading>This card only</Heading>
          <LayerList elements={local} depth={0} />
        </>
      )}
      <Heading>
        {mode === 'card'
          ? `Template parts · ${template?.name ?? 'none'}`
          : (template?.name ?? 'Template')}
      </Heading>
      {template?.elements.length ? (
        <LayerList elements={template.elements} depth={0} />
      ) : (
        <p className="px-4 py-2 text-sm text-muted-foreground">
          No layers yet. Add text, an image or a shape.
        </p>
      )}
      {mode === 'card' && (
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          Use the eye to hide a template part on this card only. Other parts stay where they are.
        </p>
      )}
    </div>
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

const ICONS = { text: Type, imageField: ImagePlus, image: ImageIcon, shape: Shapes, group: Folder }

function LayerRow({
  el,
  depth,
  handle,
  dragged,
}: {
  el: Element
  depth: number
  handle: ReturnType<ReturnType<typeof useReorder>['handleProps']>
  dragged: boolean
}) {
  const selected = useEditor((s) => s.view.selection.includes(el.id))
  const mode = useEditor((s) => s.view.mode)
  const editable = useEditor((s) => isLayoutEditable(s, el.id))
  const visible = useEditor((s) => {
    if (s.view.mode === 'card' && !editable) return isVisibleOnCard(el, currentCard(s))
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
            className="grid h-full w-6 shrink-0 place-items-center text-muted-foreground"
          >
            <GripVertical className="size-3.5" />
          </span>
        ) : (
          <span className="w-6 shrink-0" />
        )}
        {el.type === 'group' ? (
          <button
            type="button"
            aria-label={open ? 'Collapse group' : 'Expand group'}
            onClick={() => setOpen(!open)}
            className="grid size-6 shrink-0 place-items-center"
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
            </span>
          )}
        </button>
        <IconButton
          label={visible ? `Hide ${el.name}` : `Show ${el.name}`}
          size="icon-sm"
          disabled={!canToggle}
          title={!canToggle ? 'This part is always shown' : undefined}
          onClick={() => toggleVisibility(el.id)}
        >
          {visible ? <Eye /> : <EyeOff />}
        </IconButton>
        {editable && (
          <IconButton
            label={el.editLocked ? `Unlock ${el.name}` : `Lock ${el.name}`}
            size="icon-sm"
            onClick={() => toggleEditLock(el.id)}
            className={cn(!el.editLocked && 'text-muted-foreground/60')}
          >
            {el.editLocked ? <Lock /> : <LockOpen />}
          </IconButton>
        )}
      </div>
      {el.type === 'group' && open && <LayerList elements={el.children} depth={depth + 1} />}
    </>
  )
}
