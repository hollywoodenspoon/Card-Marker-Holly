import { FileDown, Loader2 } from '@/ui/icons'
import { useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { printEntries } from '@/print/printList'
import { deckSize } from '@/templates/deckCommands'
import { downloadBlob } from '@/ui/actions/download'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Label, NativeSelect } from '@/ui/components/ui/input'
import { useUi } from '@/ui/uiStore'

/** Export a deck (or the print list) as Tabletop Simulator deck sheets. */
export function TtsDialog() {
  const open = useUi((s) => s.ttsOpen)
  const close = () => useUi.getState().setTtsOpen(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        title="Export for Tabletop Simulator"
        description="Deck sheets (10 × 7 cards) and backs for a Custom Deck, in one zip with instructions."
      >
        {open && <TtsForm onDone={close} />}
      </DialogContent>
    </Dialog>
  )
}

function TtsForm({ onDone }: { onDone: () => void }) {
  const doc = useEditor((s) => s.doc!)
  const library = useEditor((s) => s.library)
  const decks = doc.project.decks ?? []
  const [deckId, setDeckId] = useState(doc.project.print.deckId ?? decks[0]?.id ?? '')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const deck = decks.find((d) => d.id === deckId)
  const count = deck
    ? deckSize(deck)
    : printEntries(Object.values(doc.cards), doc.project.print).reduce((n, e) => n + e.copies, 0)

  const run = async () => {
    setError(null)
    setBusy('Preparing…')
    try {
      const { exportTts } = await import('@/print/tts/exportTts')
      const r = await exportTts(
        {
          project: doc.project,
          templates: doc.templates,
          cards: Object.values(doc.cards),
          assets: library.assets,
          fonts: Object.values(library.fonts),
          stylePresets: doc.stylePresets,
        },
        deck?.id ?? null,
        (d, t) => setBusy(`Sheet ${d} of ${t}…`),
      )
      downloadBlob(r.blob, r.name)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="tts-source">Cards</Label>
        <NativeSelect id="tts-source" value={deckId} onChange={(e) => setDeckId(e.target.value)}>
          <option value="">Print list (with its copies)</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              Deck: {d.name} ({deckSize(d)})
            </option>
          ))}
        </NativeSelect>
      </div>
      <p className="text-sm text-muted-foreground" data-testid="tts-summary">
        {count} card{count === 1 ? '' : 's'} · {Math.max(1, Math.ceil(count / 69))} sheet
        {count > 69 ? 's' : ''}. Cards with different backs get matching back sheets.
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button onClick={run} disabled={!!busy || count === 0}>
          {busy ? <Loader2 className="animate-spin" /> : <FileDown />} {busy ?? 'Export'}
        </Button>
      </div>
    </div>
  )
}
