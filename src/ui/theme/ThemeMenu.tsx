import { Check, Monitor, Moon, Palette, Sun } from '@/ui/icons'
import { cn } from '@/lib/cn'
import { DropdownMenuItem } from '@/ui/components/ui/dropdown'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import {
  openThemePicker,
  setTheme,
  THEME_GROUPS,
  THEMES,
  useThemeDialog,
  useThemeSetting,
  type ThemeSetting,
} from './theme'

/** "Theme…" for a menu; the picker itself is <ThemePicker />, mounted once per app. */
export function ThemeMenuItems() {
  return (
    <DropdownMenuItem onSelect={openThemePicker}>
      <Palette /> Theme…
    </DropdownMenuItem>
  )
}

const BASICS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'Follow system', icon: Monitor },
] as const

function Swatch({
  id,
  label,
  current,
  children,
}: {
  id: ThemeSetting
  label: string
  current: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={current}
      onClick={() => setTheme(id)}
      data-theme-option={id}
      className={cn(
        'flex min-h-11 items-center gap-2.5 rounded-lg border p-2 text-left text-sm hover:bg-muted',
        current && 'border-accent ring-2 ring-accent',
      )}
    >
      {children}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {current && <Check className="size-4 shrink-0 text-accent" />}
    </button>
  )
}

/** All themes in groups, as swatches. Choosing one applies it right away. */
export function ThemePicker() {
  const open = useThemeDialog((s) => s.open)
  const theme = useThemeSetting()
  return (
    <Dialog open={open} onOpenChange={(o) => useThemeDialog.setState({ open: o })}>
      <DialogContent
        title="Theme"
        description="Colours for the app around your cards. The area behind the card always stays neutral grey."
        className="max-w-3xl"
      >
        <div className="flex flex-col gap-4" role="radiogroup" aria-label="Theme">
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Basics
            </h3>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
              {BASICS.map((b) => (
                <Swatch key={b.id} id={b.id} label={b.label} current={theme === b.id}>
                  <b.icon className="size-5 shrink-0" />
                </Swatch>
              ))}
            </div>
          </section>
          {THEME_GROUPS.map((g) => (
            <section key={g} className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {g}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-2">
                {THEMES.filter((t) => t.group === g).map((t) => (
                  <Swatch key={t.id} id={t.id} label={t.label} current={theme === t.id}>
                    <span
                      className="flex h-6 w-9 shrink-0 overflow-hidden rounded-md border"
                      aria-hidden
                    >
                      {t.swatch.map((c, i) => (
                        <span key={i} className="flex-1" style={{ background: c }} />
                      ))}
                    </span>
                  </Swatch>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
