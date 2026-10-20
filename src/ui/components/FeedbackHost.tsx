import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import { dismiss, useFeedback, type TextAsk } from './feedback'
import { Button, IconButton } from './ui/button'
import { Dialog, DialogContent } from './ui/dialog'
import { Input, Label } from './ui/input'

/** Shows the questions and messages asked for through feedback.ts. */
export function FeedbackHost() {
  const ask = useFeedback((s) => s.ask)
  const toasts = useFeedback((s) => s.toasts)
  const close = (value: string | boolean | null) => {
    if (!ask) return
    useFeedback.setState({ ask: null })
    if (ask.kind === 'text') ask.resolve(typeof value === 'string' ? value : null)
    else ask.resolve(value === true)
  }
  return (
    <>
      <Dialog
        open={!!ask}
        onOpenChange={(o) => !o && close(ask?.kind === 'confirm' ? false : null)}
      >
        {ask && (
          <DialogContent title={ask.title} description={ask.description} className="z-[80]">
            {ask.kind === 'text' ? (
              <TextForm ask={ask} onDone={close} />
            ) : (
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => close(false)}>
                  Cancel
                </Button>
                <Button
                  variant={ask.danger ? 'danger' : 'default'}
                  autoFocus
                  onClick={() => close(true)}
                >
                  {ask.okLabel ?? 'OK'}
                </Button>
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-md items-center gap-2 rounded-xl border bg-foreground py-1.5 pr-1.5 pl-4 text-sm text-background shadow-lg',
              t.tone === 'error' && 'border-danger bg-danger text-white',
            )}
            data-testid="toast"
          >
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.action && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  t.action!.run()
                  dismiss(t.id)
                }}
              >
                {t.action.label}
              </Button>
            )}
            <IconButton
              label="Dismiss"
              size="icon-sm"
              className="text-inherit hover:bg-white/15"
              onClick={() => dismiss(t.id)}
            >
              <X />
            </IconButton>
          </div>
        ))}
      </div>
    </>
  )
}

function TextForm({ ask, onDone }: { ask: TextAsk; onDone: (v: string | null) => void }) {
  const [value, setValue] = useState(ask.initial)
  // Select the suggested text so typing replaces it.
  const [input, setInput] = useState<HTMLInputElement | null>(null)
  useEffect(() => {
    input?.select()
  }, [input])
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        onDone(value.trim() || (ask.allowEmpty ? '' : null))
      }}
    >
      <div className="flex flex-col gap-1.5">
        {ask.label && <Label htmlFor="ask-text">{ask.label}</Label>}
        <Input
          id="ask-text"
          ref={setInput}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label={ask.label ?? ask.title}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => onDone(null)}>
          Cancel
        </Button>
        <Button type="submit">{ask.okLabel ?? 'OK'}</Button>
      </div>
    </form>
  )
}
