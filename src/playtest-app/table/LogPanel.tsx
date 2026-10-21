import { Copy } from '@/ui/icons'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/ui/components/ui/button'
import { toast } from '@/ui/components/feedback'
import { Input } from '@/ui/components/ui/input'
import { usePlaytest } from './usePlaytest'

/** What happened, newest at the bottom, with notes and Copy (for playtest notes). */
export function LogPanel() {
  const log = usePlaytest((s) => s.state?.log ?? [])
  const setup = usePlaytest((s) => s.setup)
  const act = usePlaytest((s) => s.act)
  const [note, setNote] = useState('')
  const end = useRef<HTMLLIElement>(null)
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest' }), [log.length])
  const copy = async () => {
    const text = [`Playtest: ${setup?.name ?? ''}`, ...log.map((l) => `${l.n}. ${l.text}`)].join(
      '\n',
    )
    try {
      await navigator.clipboard.writeText(text)
      toast('Game log copied.')
    } catch {
      toast('Could not copy the log.')
    }
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 p-2" data-testid="playtest-log">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Game log</span>
        <span className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => void copy()}>
          <Copy /> Copy
        </Button>
      </div>
      <ol className="min-h-0 flex-1 space-y-0.5 overflow-auto text-xs">
        {log.map((l) => (
          <li key={l.n} className="flex gap-2">
            <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">
              {l.n}
            </span>
            <span className={l.text.startsWith('Note:') ? 'font-medium text-accent' : undefined}>
              {l.text}
            </span>
          </li>
        ))}
        <li ref={end} />
      </ol>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          act({ t: 'note', text: note })
          setNote('')
        }}
      >
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          aria-label="Note"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!note.trim()}>
          Add
        </Button>
      </form>
    </div>
  )
}
