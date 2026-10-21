import { AlertCircle, Check, Loader2 } from '@/ui/icons'
import { cn } from '@/lib/cn'
import { useSaveStatus } from '@/storage/saveStatus'

export function SaveIndicator({ compact }: { compact?: boolean }) {
  const { status, error } = useSaveStatus()
  const label = status === 'saved' ? 'Saved' : status === 'error' ? 'Not saved' : 'Saving…'
  return (
    <span
      role="status"
      aria-live="polite"
      title={status === 'error' ? `Saving failed: ${error}` : label}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-muted-foreground',
        status === 'error' && 'bg-danger/10 text-danger',
      )}
    >
      {status === 'saved' && <Check className="size-3.5" />}
      {(status === 'saving' || status === 'pending') && (
        <Loader2 className="size-3.5 animate-spin" />
      )}
      {status === 'error' && <AlertCircle className="size-3.5" />}
      <span className={cn(compact && 'sr-only')}>{label}</span>
    </span>
  )
}
