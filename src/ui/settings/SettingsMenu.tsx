import { CircleHelp, Ruler, Settings2, Type } from '@/ui/icons'
import { openSettings } from './settingsDialogStore'
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
 * ☰ → Settings: the Settings dialog (appearance, fonts), Help, Units (in a project),
 * Theme, and the desktop app's update and the browser's install items. The same in
 * every workspace's menu.
 */
export function SettingsMenu({ onHelp, onUnits }: { onHelp: () => void; onUnits?: () => void }) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Settings2 /> Settings
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onSelect={() => openSettings()} data-testid="open-settings">
          <Settings2 /> Settings…
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openSettings('fonts')}>
          <Type /> Fonts…
        </DropdownMenuItem>
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
