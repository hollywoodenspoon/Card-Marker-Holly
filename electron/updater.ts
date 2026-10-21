import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { app, ipcMain, net, shell, type BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateEvent } from '../src/platform/desktop'
import { compareVersions, isPrerelease, newestTag, shortError } from './updateHosts'

/**
 * Updates from GitHub Releases, only when the user turned them on.
 *   auto:   the AppImage and the installed Windows app download the new version
 *           and install it when the app closes (or on "Restart now").
 *   notify: the portable exe and the Arch package can't replace themselves, so
 *           they only say that a new version is out: with a download link, or
 *           for the Arch package the pacman command (it updates from our repo).
 */
const RELEASES = 'https://github.com/hollywoodenspoon/Card-Marker-Holly/releases'

export type UpdateMode = 'auto' | 'notify'
const settingsFile = () => path.join(app.getPath('userData'), 'updates.json')

/** On / off / not asked yet (null). */
export function updatesEnabled(): boolean | null {
  try {
    const v = JSON.parse(readFileSync(settingsFile(), 'utf8')).enabled
    return typeof v === 'boolean' ? v : null
  } catch {
    return null
  }
}

function setEnabled(enabled: boolean) {
  writeFileSync(settingsFile(), JSON.stringify({ enabled }, null, 2))
}

/** The Arch package (installed under /opt): pacman updates it from the cardworks repository. */
const pacman = () =>
  app.isPackaged && process.platform === 'linux' && !process.env.APPIMAGE && __dirname.startsWith('/opt/')

export function updateMode(): UpdateMode {
  if (!app.isPackaged) return 'notify'
  if (process.platform === 'linux') return process.env.APPIMAGE ? 'auto' : 'notify'
  if (process.platform === 'win32') return process.env.PORTABLE_EXECUTABLE_DIR ? 'notify' : 'auto'
  return 'notify'
}

/**
 * Newest release on GitHub, from the public release feed (no API rate limit).
 * Pre-releases (alpha, beta, rc) count only while this version is one too.
 */
async function latestRelease(): Promise<{ version: string; url: string } | null> {
  const res = await net.fetch(`${RELEASES}.atom`)
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
  return newestTag(await res.text(), isPrerelease(app.getVersion()))
}

/**
 * Wire up update checks. `beforeInstall` lets the app save and skip its close
 * prompt before the installer takes over.
 */
export function initUpdates(win: () => BrowserWindow | null, beforeInstall: () => Promise<void>) {
  const mode = updateMode()
  const send = (e: UpdateEvent) => win()?.webContents.send('updates:event', e)
  const { autoUpdater } = electronUpdater
  let manual = false
  let ready: string | null = null

  if (mode === 'auto') {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.allowPrerelease = isPrerelease(app.getVersion())
    autoUpdater.logger = null
    let coming = ''
    autoUpdater.on('update-available', (i) => {
      coming = i.version
      send({ type: 'downloading', version: i.version })
    })
    autoUpdater.on('download-progress', (p) => {
      if (manual && coming)
        send({ type: 'downloading', version: coming, percent: Math.round(p.percent) })
    })
    autoUpdater.on('update-downloaded', (i) => {
      ready = i.version
      send({ type: 'ready', version: i.version })
    })
    autoUpdater.on('update-not-available', () => manual && send({ type: 'none' }))
    autoUpdater.on('error', (e) => manual && send({ type: 'error', message: shortError(e) }))
  }

  const check = async (byUser: boolean) => {
    manual = byUser
    if (ready) return send({ type: 'ready', version: ready })
    if (byUser) send({ type: 'checking' })
    try {
      if (mode === 'auto') {
        // Problems arrive as the updater's 'error' event (above).
        await autoUpdater.checkForUpdates().catch(() => {})
        return
      }
      const latest = await latestRelease()
      if (latest && compareVersions(latest.version, app.getVersion()) > 0)
        send({ type: 'available', ...latest, ...(pacman() && { command: 'sudo pacman -Syu' }) })
      else if (byUser) send({ type: 'none' })
    } catch (e) {
      if (byUser) send({ type: 'error', message: shortError(e) })
    }
  }

  ipcMain.handle('updates:get', () => ({
    enabled: updatesEnabled(),
    mode,
    version: app.getVersion(),
  }))
  ipcMain.handle('updates:set', (_e, enabled: unknown) => {
    setEnabled(enabled === true)
    if (enabled === true) void check(false)
  })
  ipcMain.handle('updates:check', () => {
    if (updatesEnabled() !== true) setEnabled(true)
    return check(true)
  })
  ipcMain.handle('updates:install', async () => {
    if (!ready) return
    await beforeInstall()
    autoUpdater.quitAndInstall(false, true)
  })
  ipcMain.handle('updates:openReleases', (_e, url: unknown) =>
    shell.openExternal(typeof url === 'string' && url.startsWith(RELEASES) ? url : RELEASES),
  )

  // Once, shortly after start, when updates are on.
  if (updatesEnabled() === true) setTimeout(() => void check(false), 10_000)
}
