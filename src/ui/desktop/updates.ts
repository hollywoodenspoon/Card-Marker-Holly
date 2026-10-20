import { create } from 'zustand'
import { desktop, type UpdateEvent } from '@/platform/desktop'
import { askConfirm, toast } from '@/ui/components/feedback'

/** Desktop app updates, as the menus and messages see them. */
interface UpdateState {
  /** null: not asked yet. */
  enabled: boolean | null
  mode: 'auto' | 'notify'
  /** A downloaded version waiting for a restart. */
  ready: string | null
}

export const useUpdates = create<UpdateState>(() => ({
  enabled: null,
  mode: 'notify',
  ready: null,
}))

const updates = () => desktop()?.updates

/** Desktop only: load the setting, listen for news, and ask once whether to check. */
export async function initUpdates() {
  const u = updates()
  if (!u) return
  u.onEvent(onEvent)
  const s = await u.get()
  useUpdates.setState({ enabled: s.enabled, mode: s.mode })
  if (s.enabled !== null) return
  const yes = await askConfirm({
    title: 'Check for updates automatically?',
    description:
      s.mode === 'auto'
        ? 'The app then asks GitHub once at start whether a newer version exists, downloads it, and installs it when you close the app. Nothing else is sent. You can change this in the ☰ menu.'
        : 'The app then asks GitHub once at start whether a newer version exists and tells you. Nothing else is sent. You can change this in the ☰ menu.',
    okLabel: 'Yes, check',
    cancelLabel: 'No, stay offline',
  })
  await setUpdatesEnabled(yes)
}

export async function setUpdatesEnabled(enabled: boolean) {
  await updates()?.set(enabled)
  useUpdates.setState({ enabled })
}

export const checkForUpdates = () => {
  useUpdates.setState({ enabled: true })
  return updates()?.check()
}

export const installUpdate = () => updates()?.install()

function onEvent(e: UpdateEvent) {
  const u = updates()
  switch (e.type) {
    case 'checking':
      return toast('Checking for updates…')
    case 'none':
      return toast('You have the newest version.')
    case 'available':
      return toast(`Version ${e.version} is out.`, {
        action: { label: 'Download', run: () => void u?.openReleases(e.url) },
      })
    case 'downloading':
      return toast(
        `Downloading version ${e.version}${e.percent != null ? ` (${e.percent}%)` : ''}…`,
      )
    case 'ready':
      useUpdates.setState({ ready: e.version })
      return toast(`Version ${e.version} is ready. It installs when you close the app.`, {
        action: { label: 'Restart now', run: () => void installUpdate() },
      })
    case 'error':
      return toast(`Couldn't check for updates: ${e.message}`, { tone: 'error' })
  }
}
