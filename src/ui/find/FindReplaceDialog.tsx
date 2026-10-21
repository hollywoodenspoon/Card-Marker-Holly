import { Undo2 } from '@/ui/icons'
import { useMemo, useState } from 'react'
import { selectCard } from '@/core/editor/cardCommands'
import { commit, undo, useEditor } from '@/core/editor/editorStore'
import {
  findMatches,
  findPattern,
  replaceAt,
  type FindOptions,
  type Match,
} from '@/templates/findReplace'
import { editTemplate } from '@/templates/commands'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Input, Label } from '@/ui/components/ui/input'
import { useUi } from '@/ui/uiStore'

/** Find and replace across all card text (and optionally template text). */
export function FindReplaceDialog() {
  const open = useUi((s) => s.findOpen)
  const close = () => useUi.getState().setFindOpen(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        title="Find and replace"
        description="Searches every card's text. One undo puts everything back."
        className="max-w-xl"
      >
        {open && <FindForm onClose={close} />}
      </DialogContent>
    </Dialog>
  )
}

const key = (m: Match) => JSON.stringify(m.place)

function FindForm({ onClose }: { onClose: () => void }) {
  const doc = useEditor((s) => s.doc!)
  const [find, setFind] = useState('')
  const [repl, setRepl] = useState('')
  const [opts, setOpts] = useState<FindOptions>({})
  const [skip, setSkip] = useState<Set<string>>(new Set())
  const [done, setDone] = useState<string | null>(null)
  const matches = useMemo(() => findMatches(find, opts, doc), [find, opts, doc])
  const chosen = matches.filter((m) => !skip.has(key(m)))
  const total = chosen.reduce((n, m) => n + m.count, 0)
  const re = findPattern(find, opts)

  const run = () => {
    let n = 0
    commit((d) => {
      n = replaceAt(
        d,
        chosen.map((m) => m.place),
        find,
        repl,
        opts,
      )
    })
    setDone(`Replaced ${n} time${n === 1 ? '' : 's'}.`)
    setSkip(new Set())
  }
  const open = (m: Match) => {
    if (m.place.kind === 'template') editTemplate(m.place.templateId)
    else selectCard(m.place.cardId)
    onClose()
  }
  const opt = (k: keyof FindOptions, label: string) => (
    <label className="flex min-h-11 items-center gap-2 text-sm md:min-h-8">
      <input
        type="checkbox"
        className="size-4 accent-accent"
        checked={!!opts[k]}
        onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })}
      />
      {label}
    </label>
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="fr-find">Find</Label>
          <Input
            id="fr-find"
            autoFocus
            value={find}
            onChange={(e) => {
              setFind(e.target.value)
              setDone(null)
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="fr-repl">Replace with</Label>
          <Input id="fr-repl" value={repl} onChange={(e) => setRepl(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4">
        {opt('matchCase', 'Match capitals')}
        {opt('wholeWord', 'Whole words')}
        {opt('templates', 'Also template text')}
      </div>
      {find && (
        <ul
          className="max-h-64 overflow-auto rounded-lg border text-sm"
          aria-label="Matches"
          data-testid="find-matches"
        >
          {matches.length === 0 && <li className="p-3 text-muted-foreground">No matches.</li>}
          {matches.map((m) => (
            <li
              key={key(m)}
              className="flex items-start gap-2 border-b px-2 py-1.5 last:border-b-0"
            >
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0 accent-accent"
                aria-label={`Replace in ${m.label}`}
                checked={!skip.has(key(m))}
                onChange={(e) => {
                  const n = new Set(skip)
                  if (e.target.checked) n.delete(key(m))
                  else n.add(key(m))
                  setSkip(n)
                }}
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  className="text-left text-xs font-medium hover:underline"
                  onClick={() => open(m)}
                >
                  {m.label} · {m.count}×
                </button>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {re ? highlight(m.text, re) : m.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {done && (
        <p role="status" className="flex items-center gap-2 text-sm text-accent">
          {done}
          {/* Shortcuts are paused while this is open, so undo is a button here. */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              undo()
              setDone(null)
            }}
          >
            <Undo2 /> Undo
          </Button>
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground" data-testid="find-summary">
          {find
            ? `${total} match${total === 1 ? '' : 'es'} in ${chosen.length} place${chosen.length === 1 ? '' : 's'}`
            : ''}
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={run} disabled={!total}>
            Replace all
          </Button>
        </div>
      </div>
    </div>
  )
}

/** The text with each match marked. */
function highlight(text: string, re: RegExp) {
  const out: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0
    if (i > last) out.push(text.slice(last, i))
    out.push(
      <mark key={i} className="rounded bg-accent-soft px-0.5 text-foreground">
        {m[0]}
      </mark>,
    )
    last = i + m[0].length
  }
  out.push(text.slice(last))
  return out
}
