import { Check, RefreshCw, RotateCw } from '@/ui/icons'
import { desktop } from '@/platform/desktop'
import { DropdownMenuItem } from '@/ui/components/ui/dropdown'
import { checkForUpdates, installUpdate, setUpdatesEnabled, useUpdates } from './updates'

/** ☰ items in the desktop app: check now (or restart into a downloaded version), and the setting. */
export function UpdateMenuItems() {
  const enabled = useUpdates((s) => s.enabled)
  const ready = useUpdates((s) => s.ready)
  if (!desktop()?.updates) return null
  return (
    <>
      {ready ? (
        <DropdownMenuItem onSelect={() => void installUpdate()}>
          <RotateCw /> Restart to update to {ready}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onSelect={() => void checkForUpdates()}>
          <RefreshCw /> Check for updates
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault()
          void setUpdatesEnabled(!enabled)
        }}
      >
        <Check className={enabled ? '' : 'opacity-0'} /> Automatic update checks
      </DropdownMenuItem>
    </>
  )
}
