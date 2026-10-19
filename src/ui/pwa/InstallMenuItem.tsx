import { Download } from 'lucide-react'
import { DropdownMenuItem } from '@/ui/components/ui/dropdown'
import { promptInstall, usePwa } from './pwa'

/** "Install app" entry, shown only when the browser offers installation. */
export function InstallMenuItem() {
  const canInstall = usePwa((s) => s.canInstall)
  if (!canInstall) return null
  return (
    <DropdownMenuItem onSelect={() => void promptInstall()}>
      <Download /> Install app
    </DropdownMenuItem>
  )
}
