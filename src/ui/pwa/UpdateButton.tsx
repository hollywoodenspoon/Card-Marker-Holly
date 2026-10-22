import { RefreshCw } from '@/ui/icons'
import { useState } from 'react'
import { Button } from '@/ui/components/ui/button'
import { checkNow } from './checkNow'

/** "Check for updates", for the footers. */
export function UpdateButton() {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        void checkNow().finally(() => setBusy(false))
      }}
      data-testid="check-updates"
    >
      <RefreshCw className={busy ? 'animate-spin' : undefined} /> Check for updates
    </Button>
  )
}
