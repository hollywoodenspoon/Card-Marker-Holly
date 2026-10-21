import {
  Check,
  Copy,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
} from '@/ui/icons'
import { useMemo, useState } from 'react'
import { registerProjectFonts } from '@/assets/fonts'
import { useEditor } from '@/core/editor/editorStore'
import { currentCard } from '@/core/editor/selectors'
import type { Side, Template } from '@/core/model/types'
import { cn } from '@/lib/cn'
import {
  deleteTemplate,
  downloadTemplate,
  duplicateTemplate,
  editTemplate,
  newTemplate,
  renameTemplate,
  saveCurrentCardAsTemplate,
  uploadTemplate,
} from '@/templates/commands'
import { cardsUsingTemplate } from '@/templates/fields'
import { pickFiles } from '@/ui/actions/imageActions'
import { CardThumb } from '@/ui/canvas/CardThumb'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/ui/components/ui/dropdown'
import { Input } from '@/ui/components/ui/input'
import { toast } from '@/ui/components/feedback'
import { pickBackForAllCards, pickTemplateForCard } from '@/ui/actions/templateUse'

export function TemplatesPanel({ onPicked }: { onPicked?: () => void }) {
  const templates = useEditor((s) => s.doc?.templates)
  const side = useEditor((s) => s.view.side)
  const [nameDialog, setNameDialog] = useState<null | {
    title: string
    initial: string
    run: (n: string) => void
  }>(null)
  const [deleting, setDeleting] = useState<Template | null>(null)
  const cards = useEditor((s) => s.doc?.cards)
  const usage = deleting && cards ? cardsUsingTemplate(Object.values(cards), deleting.id).length : 0

  const bySide = useMemo(() => {
    const list = Object.values(templates ?? {}).sort((a, b) => a.createdAt - b.createdAt)
    return {
      front: list.filter((t) => t.side === 'front'),
      back: list.filter((t) => t.side === 'back'),
    }
  }, [templates])
  const order: Side[] = side === 'back' ? ['back', 'front'] : ['front', 'back']

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto pb-4">
      <div className="flex flex-wrap gap-2 p-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setNameDialog({
              title: 'Save this card as a template',
              initial: `${currentCard(useEditor.getState())?.name ?? 'Card'} layout`,
              run: (n) => saveCurrentCardAsTemplate(n),
            })
          }
        >
          <Save /> Save card as template
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const [f] = await pickFiles('.json,application/json', false)
            if (!f) return
            try {
              await uploadTemplate(f, registerProjectFonts)
            } catch (e) {
              toast(e instanceof Error ? e.message : 'Could not import this file.', {
                tone: 'error',
              })
            }
          }}
        >
          <Upload /> Import
        </Button>
      </div>
      {order.map((sd) => (
        <section key={sd}>
          <div className="flex items-center justify-between px-4 pt-2 pb-1">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {sd === 'front' ? 'Fronts' : 'Backs'}
            </h3>
            <IconButton label={`New ${sd} template`} size="icon-sm" onClick={() => newTemplate(sd)}>
              <Plus />
            </IconButton>
          </div>
          <ul className="space-y-1 px-2">
            {bySide[sd].map((t) => (
              <TemplateRow
                key={t.id}
                t={t}
                onPicked={onPicked}
                onRename={() =>
                  setNameDialog({
                    title: 'Rename template',
                    initial: t.name,
                    run: (n) => renameTemplate(t.id, n),
                  })
                }
                onDelete={() => setDeleting(t)}
              />
            ))}
            {!bySide[sd].length && (
              <li className="px-2 py-1 text-sm text-muted-foreground">No {sd} templates yet.</li>
            )}
          </ul>
        </section>
      ))}

      <Dialog open={!!nameDialog} onOpenChange={(o) => !o && setNameDialog(null)}>
        <DialogContent title={nameDialog?.title ?? ''}>
          {nameDialog && (
            <NameForm
              initial={nameDialog.initial}
              onCancel={() => setNameDialog(null)}
              onSave={(n) => {
                nameDialog.run(n)
                setNameDialog(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent
          title="Delete template?"
          description={
            usage
              ? `${usage} card${usage > 1 ? 's use' : ' uses'} “${deleting?.name}”. They will switch to another ${deleting?.side} template. Their field values are kept.`
              : `“${deleting?.name}” is not used by any card.`
          }
        >
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteTemplate(deleting!.id)
                setDeleting(null)
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TemplateRow({
  t,
  onPicked,
  onRename,
  onDelete,
}: {
  t: Template
  onPicked?: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const card = useEditor(currentCard)
  const editing = useEditor((s) => s.view.mode === 'template' && s.view.templateId === t.id)
  const count = useEditor((s) =>
    s.doc ? cardsUsingTemplate(Object.values(s.doc.cards), t.id).length : 0,
  )
  const inUse = card && (t.side === 'front' ? card.frontTemplateId : card.backTemplateId) === t.id
  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-lg p-1.5',
        editing ? 'bg-accent-soft' : 'hover:bg-muted',
      )}
    >
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        onClick={() => {
          // Opening the Templates tab means editing layouts: a click edits this one.
          // Using it for the current card is in ⋯.
          editTemplate(t.id)
          onPicked?.()
        }}
        title={`Edit ${t.name}`}
      >
        <CardThumb template={t} side={t.side} heightPx={44} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 truncate text-sm font-medium">
            {t.name}
            {inUse && (
              <Check className="size-3.5 shrink-0 text-accent" aria-label="Used by this card" />
            )}
          </span>
          <span className="block text-xs text-muted-foreground">
            {count} card{count === 1 ? '' : 's'}
          </span>
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={`Options for ${t.name}`} size="icon-sm">
            <MoreHorizontal />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => pickTemplateForCard(t.id)}>
            <Check /> Use for this card
          </DropdownMenuItem>
          {t.side === 'back' && (
            <DropdownMenuItem onSelect={() => pickBackForAllCards(t.id)}>
              <Check /> Use as back for all cards
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onRename}>
            <Pencil /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicateTemplate(t.id)}>
            <Copy /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void downloadTemplate(t.id)}>
            <Download /> Export file
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem danger onSelect={onDelete}>
            <Trash2 /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}

function NameForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (n: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial)
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(name.trim() || initial)
      }}
    >
      <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Name" />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  )
}
