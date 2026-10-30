import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { HelpHost } from '@/help/HelpHost'
import { FeedbackHost } from '@/ui/components/FeedbackHost'
import { PwaToast } from '@/ui/pwa/PwaToast'
import { SettingsDialog } from '@/ui/settings/SettingsDialog'
import { ThemePicker } from '@/ui/theme/ThemeMenu'
import { useUi } from '@/ui/uiStore'
import { APP_NAME, APP_VERSION } from './appInfo'
import { CardsApp } from './CardsApp'
import { useWorkspace, WORKSPACES, type Workspace } from './workspace'

// Play (Hearthside Table) and Engine load only when first opened, so the card editor
// stays as quick as before and Three.js loads only for the Engine. Neither is in Cozy.
const PlayApp = __COZY__
  ? null
  : lazy(() => import('@/playtest-app/App').then((m) => ({ default: m.App })))
const EngineApp = __COZY__
  ? null
  : lazy(() => import('@/engine/App').then((m) => ({ default: m.App })))

/**
 * One app, three workspaces: Cards, Engine and Play. A workspace stays mounted once
 * opened (hidden when another is on screen), so a map or a game in progress is
 * exactly as it was when you come back.
 */
export function App() {
  const ws = useWorkspace((s) => s.ws)
  const [seen, setSeen] = useState<ReadonlySet<Workspace>>(() => new Set([ws]))
  if (!seen.has(ws)) setSeen(new Set(seen).add(ws))

  useEffect(() => {
    const label = WORKSPACES.find((w) => w.id === ws)?.label
    document.title =
      ws === 'cards' ? `${APP_NAME} ${APP_VERSION}` : `${label} · ${APP_NAME} ${APP_VERSION}`
    // Help is the card editor's: a link from it to another workspace closes it.
    if (ws !== 'cards' && useUi.getState().help) useUi.getState().setHelp(null)
  }, [ws])

  return (
    <>
      {seen.has('cards') && (
        <Pane on={ws === 'cards'}>
          <CardsApp />
        </Pane>
      )}
      {PlayApp && seen.has('play') && (
        <Pane on={ws === 'play'}>
          <Suspense fallback={<Loading />}>
            <PlayApp />
          </Suspense>
        </Pane>
      )}
      {EngineApp && seen.has('engine') && (
        <Pane on={ws === 'engine'}>
          <Suspense fallback={<Loading />}>
            <EngineApp />
          </Suspense>
        </Pane>
      )}
      <PwaToast />
      <HelpHost />
      <FeedbackHost />
      <ThemePicker />
      <SettingsDialog />
    </>
  )
}

function Pane({ on, children }: { on: boolean; children: ReactNode }) {
  return <div style={{ display: on ? 'contents' : 'none' }}>{children}</div>
}

function Loading() {
  return <div className="h-app bg-background" aria-busy="true" />
}
