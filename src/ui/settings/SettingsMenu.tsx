import { CircleHelp, Ruler, Settings2 } from '@/ui/icons'
import { UpdateMenuItems } from '@/ui/desktop/UpdateMenuItems'
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/ui/components/ui/dropdown'
import { InstallMenuItem } from '@/ui/pwa/InstallMenuItem'
import { ThemeMenuItems } from '@/ui/theme/ThemeMenu'

/**
 * ☰ → Settings: Help, Units (in a project), Theme, and the desktop app's
 * update and the browser's install items. The same in every menu of both apps.
 */
export function SettingsMenu({ onHelp, onUnits }: { onHelp: () => void; onUnits?: () => void }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Settings2 /> Settings
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onSelect={onHelp}>
          <CircleHelp /> Help
        </DropdownMenuItem>
        {onUnits && (
          <DropdownMenuItem onSelect={onUnits}>
            <Ruler /> Units…
          </DropdownMenuItem>
        )}
        <ThemeMenuItems />
        <UpdateMenuItems />
        <InstallMenuItem />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
