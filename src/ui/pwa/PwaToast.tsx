import { CloudOff, RefreshCw, X } from '@/ui/icons'
import { Button, IconButton } from '@/ui/components/ui/button'
import { applyUpdate, dismissPwaToast, usePwa } from './pwa'

/** "Ready to work offline" / "Update available" notice. */
export function PwaToast() {
  const { offlineReady, needRefresh } = usePwa()
  if (!offlineReady && !needRefresh) return null
  return (
    <div
      role="status"
      className="pb-safe fixed bottom-24 left-1/2 z-[60] flex w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 items-center gap-2 rounded-xl border bg-panel p-2 pl-3 text-sm shadow-xl md:bottom-6"
    >
      {needRefresh ? (
        <RefreshCw className="size-4 shrink-0 text-accent" />
      ) : (
        <CloudOff className="size-4 shrink-0 text-accent" />
      )}
      <span className="min-w-0 flex-1">
        {needRefresh ? 'A new version is available.' : 'Ready to work offline.'}
      </span>
      {needRefresh && (
        <Button size="sm" onClick={applyUpdate}>
          Update
        </Button>
      )}
      <IconButton label="Dismiss" size="icon-sm" onClick={dismissPwaToast}>
        <X />
      </IconButton>
    </div>
  )
}
