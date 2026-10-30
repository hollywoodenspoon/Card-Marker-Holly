import { FileDown, Loader2, Play } from '@/ui/icons'
import { useMemo, useState } from 'react'
import { APP_VERSION } from '@/app/appInfo'
import { useWorkspace } from '@/app/workspace'
import { useEditor } from '@/core/editor/editorStore'
import { packFieldValues } from '@/print/pack/exportPack'
import { deckSize } from '@/templates/deckCommands'
import { downloadBlob } from '@/ui/actions/download'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { useUi } from '@/ui/uiStore'

/**
 * Export the card pool and decks as a game pack for the Playtest app. On the
 * web, "Playtest now" hands the pack straight to the Playtest app (same site,
 * shared browser storage) and opens it in a new tab.
 */
export function GamePackDialog() {
  const open = useUi((s) => s.packOpen)
  const close = () => useUi.getState().setPackOpen(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        title="Playtest: export a game pack"
        description="Every card's picture and field values, and your decks, in one file for the Playtest app."
      >
        {open && <PackForm onDone={close} />}
      </DialogContent>
    </Dialog>
  )
}

function PackForm({ onDone }: { onDone: () => void }) {
  const doc = useEditor((s) => s.doc!)
  const library = useEditor((s) => s.library)
  const decks = doc.project.decks ?? []
  const cards = Object.values(doc.cards)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The field names the Playtest app will be able to read.
  const fields = useMemo(() => {
    const names = new Set<string>()
    for (const c of cards)
      for (const k of Object.keys(packFieldValues(c, doc.templates))) names.add(k)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [cards, doc.templates])

  const run = async (playNow: boolean) => {
    setError(null)
    setBusy('Preparing…')
    try {
      const { exportGamePack } = await import('@/print/pack/exportPack')
      const r = await exportGamePack(
        {
          project: doc.project,
          templates: doc.templates,
          cards,
          assets: library.assets,
          fonts: Object.values(library.fonts),
          stylePresets: doc.stylePresets,
        },
        APP_VERSION,
        (d, t) => setBusy(`Card ${d} of ${t}…`),
      )
      if (playNow) {
        const { addPack } = await import('@/playtest/library')
        const info = await addPack(r.bytes)
        useWorkspace.getState().go('play', info.projectId)
      } else
        downloadBlob(
          new Blob([r.bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
          r.name,
        )
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-1 text-sm" data-testid="pack-summary">
        <p>
          <span className="font-medium">
            {cards.length} card{cards.length === 1 ? '' : 's'}
          </span>{' '}
          (the whole card pool)
          {decks.length > 0 && (
            <>
              {' '}
              and {decks.length} deck{decks.length === 1 ? '' : 's'}:{' '}
              {decks.map((d) => `${d.name} (${deckSize(d)})`).join(', ')}
            </>
          )}
          .
        </p>
        <p className="text-muted-foreground">
          Fields included:{' '}
          {fields.length ? (
            <span className="font-mono text-xs text-foreground">{fields.join(', ')}</span>
          ) : (
            'none'
          )}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Open the file in{' '}
        <a href="#/play" className="text-accent underline" onClick={onDone}>
          Play
        </a>{' '}
        (on any device, also a friend's phone). Export again after changing cards: the new pack
        replaces the old one there.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="secondary"
          onClick={() => void run(false)}
          disabled={!!busy || !cards.length}
        >
          {busy ? <Loader2 className="animate-spin" /> : <FileDown />} {busy ?? 'Save game pack'}
        </Button>
        {/* Opens the pack in the Play workspace, in this window. */}
        <Button onClick={() => void run(true)} disabled={!!busy || !cards.length}>
          <Play /> Playtest now
        </Button>
      </div>
    </div>
  )
}
