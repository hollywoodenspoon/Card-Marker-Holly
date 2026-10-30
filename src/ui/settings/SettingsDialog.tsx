import { APP_NAME, VERSION_LABEL } from '@/app/appInfo'
import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs'
import { Info, Palette, Type } from '@/ui/icons'
import { FontsPanel } from '@/ui/panels/FontsPanel'
import { openThemePicker, THEMES, useThemeSetting } from '@/ui/theme/theme'
import { setUiScale, UI_SCALES, useUiScale } from '@/ui/theme/uiScale'
import { cn } from '@/lib/cn'

import { useSettingsDialog, type SettingsSection } from './settingsDialogStore'

const BASIC_LABELS: Record<string, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'Follow system',
}

/**
 * ☰ → Settings…: one place for the settings of every workspace. Appearance (theme and
 * UI size), Fonts (moved here from the card editor's left rail) and About.
 */
export function SettingsDialog() {
  const open = useSettingsDialog((s) => s.open)
  const theme = useThemeSetting()
  const scale = useUiScale()
  const themeLabel = BASIC_LABELS[theme] ?? THEMES.find((t) => t.id === theme)?.label ?? theme
  return (
    <Dialog open={!!open} onOpenChange={(o) => !o && useSettingsDialog.setState({ open: null })}>
      <DialogContent title="Settings" className="max-w-xl">
        <Tabs
          value={open ?? 'appearance'}
          onValueChange={(v) => useSettingsDialog.setState({ open: v as SettingsSection })}
          className="flex flex-col gap-4"
        >
          <TabsList className="w-full">
            <TabsTrigger value="appearance">
              <Palette /> Appearance
            </TabsTrigger>
            <TabsTrigger value="fonts">
              <Type /> Fonts
            </TabsTrigger>
            <TabsTrigger value="about">
              <Info /> About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Theme</h3>
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm text-muted-foreground">{themeLabel}</span>
                <Button
                  variant="outline"
                  onClick={() => {
                    useSettingsDialog.setState({ open: null })
                    openThemePicker()
                  }}
                >
                  <Palette /> Choose theme…
                </Button>
              </div>
            </section>
            <section className="flex flex-col gap-2">
              <h3 id="ui-size" className="text-sm font-medium">
                UI size
              </h3>
              <div role="radiogroup" aria-labelledby="ui-size" className="flex flex-wrap gap-1.5">
                {UI_SCALES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={scale === s}
                    data-testid={`ui-size-${Math.round(s * 100)}`}
                    onClick={() => setUiScale(s)}
                    className={cn(
                      'h-11 min-w-16 rounded-lg border px-3 text-sm transition-colors hover:bg-muted md:h-9',
                      scale === s && 'border-accent bg-accent/10 font-medium text-foreground',
                    )}
                  >
                    {Math.round(s * 100)} %
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Text, buttons and panels in every workspace, on this device. Cards keep their own
                zoom.
              </p>
            </section>
          </TabsContent>

          <TabsContent value="fonts" className="-mx-3 flex max-h-[60dvh] min-h-64 flex-col">
            <FontsPanel />
          </TabsContent>

          <TabsContent value="about" className="flex flex-col gap-1 text-sm">
            <p className="font-medium">{APP_NAME}</p>
            <p className="text-muted-foreground">Version {VERSION_LABEL}</p>
            <p className="text-muted-foreground">
              {__COZY__
                ? 'Everything stays on this device.'
                : 'Cards, Engine and Play in one app. Everything stays on this device.'}
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
