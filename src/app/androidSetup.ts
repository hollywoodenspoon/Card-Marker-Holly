import { App } from '@capacitor/app'
import { registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useEditor } from '@/core/editor/editorStore'
import { androidBridge } from '@/platform/android'
import type { FoldersPlugin } from '@/platform/androidFolders'
import { overlayOpen, sendEscape, topBackHandler } from '@/ui/components/overlay'
import { isDarkTheme, onThemeChange } from '@/ui/theme/theme'
import { goHome } from './session'

/** Android app start-up: project folders, the Back button, saving in the background, system bars. */
export function setupAndroid() {
  // Dev builds can run this in a normal browser with a stand-in plugin (for testing).
  const fake = import.meta.env.DEV ? window.__fakeAndroidFolders : undefined
  const plugin = fake ?? registerPlugin<FoldersPlugin>('CardMakerFolders')
  if (import.meta.env.DEV) window.__androidBack = onBack
  window.cardMaker = androidBridge(plugin, {
    onPause: (fn) => void App.addListener('pause', fn),
  })

  const bars = () =>
    void SystemBars.setStyle({
      style: isDarkTheme() ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
    }).catch(() => {})
  bars()
  onThemeChange(bars)

  void App.addListener('backButton', onBack)
}

function onBack() {
  // A dialog or sheet on top closes first; then a full-screen view; then the editor goes Home.
  if (document.querySelector('[role="dialog"][data-state="open"]')) return sendEscape()
  const handler = topBackHandler()
  if (handler) return handler()
  if (overlayOpen()) return sendEscape()
  if (useEditor.getState().doc) return void goHome()
  void App.exitApp()
}

declare global {
  interface Window {
    __fakeAndroidFolders?: FoldersPlugin
    __androidBack?: () => void
  }
}
