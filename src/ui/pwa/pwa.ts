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

/** Register the service worker (offline support) and listen for the install prompt. */
export function initPwa() {
  if (typeof window === 'undefined') return
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
