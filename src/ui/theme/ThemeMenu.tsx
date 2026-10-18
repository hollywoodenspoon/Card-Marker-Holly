import { Monitor, Moon, Sun } from 'lucide-react'
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/ui/components/ui/dropdown'
import { setTheme, useThemeSetting, type ThemeSetting } from './theme'

/** Theme radio items, meant to live inside an existing dropdown menu. */
export function ThemeMenuItems() {
  const theme = useThemeSetting()
  return (
    <>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeSetting)}>
        <DropdownMenuRadioItem value="light">
          <Sun /> Light
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="dark">
          <Moon /> Dark
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="system">
          <Monitor /> Follow system
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </>
  )
}
