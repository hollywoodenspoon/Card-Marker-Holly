import { Monitor, Moon, Sun } from '@/ui/icons'
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/ui/components/ui/dropdown'
import { FUN_THEMES, setTheme, useThemeSetting, type ThemeSetting } from './theme'

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
        {FUN_THEMES.map((t) => (
          <DropdownMenuRadioItem key={t.id} value={t.id}>
            <span className="flex size-4 shrink-0 overflow-hidden rounded-full border" aria-hidden>
              {t.swatch.map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} />
              ))}
            </span>
            {t.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}
