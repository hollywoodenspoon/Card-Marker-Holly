import { registerSW } from 'virtual:pwa-register'
import { create } from 'zustand'

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaState {
  offlineReady: boolean
  needRefresh: boolean
  canInstall: boolean
}

export const usePwa = create<PwaState>(() => ({
  offlineReady: false,
  needRefresh: false,
  canInstall: false,
}))

let installEvent: InstallPromptEvent | null = null
let updateSW: ((reload?: boolean) => Promise<void>) | null = null

/** How often an open app looks for a new version (it also looks when it comes back into view). */
const CHECK_EVERY_MS = 30 * 60 * 1000

/** Register the service worker (offline support) and listen for the install prompt. */
export function initPwa() {
  // The desktop app is already installed and offline; it has no service worker.
  if (typeof window === 'undefined' || window.cardMaker) return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvent = e as InstallPromptEvent
    usePwa.setState({ canInstall: true })
  })
  window.addEventListener('appinstalled', () => {
    installEvent = null
    usePwa.setState({ canInstall: false })
  })
  if (!('serviceWorker' in navigator)) return
  updateSW = registerSW({
    onOfflineReady: () => usePwa.setState({ offlineReady: true }),
    onNeedRefresh: () => usePwa.setState({ needRefresh: true }),
    // A tab or installed app brought back from the background doesn't reload,
    // so the browser never looks for an update by itself: look when it comes
    // back into view, and now and then while it stays open.
    onRegisteredSW: (_url, reg) => {
      if (!reg) return
      const check = () => {
        if (navigator.onLine) void reg.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, CHECK_EVERY_MS)
    },
  })
}

export async function promptInstall() {
  if (!installEvent) return
  await installEvent.prompt()
  await installEvent.userChoice
  installEvent = null
  usePwa.setState({ canInstall: false })
}

export function applyUpdate() {
  void updateSW?.(true)
}

export function dismissPwaToast() {
  usePwa.setState({ offlineReady: false, needRefresh: false })
}
