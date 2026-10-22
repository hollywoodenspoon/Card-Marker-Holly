/**
 * The native apps' bridge to real folders, on `window.cardMaker`: the desktop app
 * (electron/preload.ts) and the Android app (src/platform/android.ts). The web
 * build has no bridge and stores everything in the browser.
 */
export interface DesktopBridge {
  platform: string
  /** The file manager can open a folder (desktop). Default true. */
  canReveal?: boolean
  /** Deleted project folders go to the Trash / Recycle Bin. Default true. */
  hasTrash?: boolean
  /** Projects need a folder chosen first (Android); desktop defaults to Documents. */
  needsProjectsFolder?: boolean
  /** A readable name for a path (Android's are virtual, e.g. /tree/0/My Game). */
  label?(path: string): string
  /** userData: app settings; documents: the user's Documents folder. */
  paths(): Promise<{ userData: string; documents: string }>
  /** File bytes, or null when the file does not exist. */
  readFile(path: string): Promise<Uint8Array | null>
  /** Write a file, creating folders. `atomic` writes a temp file and renames it; `backup` keeps the old one as .bak. */
  writeFile(
    path: string,
    data: Uint8Array | string,
    opts?: { atomic?: boolean; backup?: boolean },
  ): Promise<void>
  exists(path: string): Promise<boolean>
  /** File names in a folder, or null when it does not exist. */
  list(dir: string): Promise<string[] | null>
  remove(path: string): Promise<void>
  /** Delete a whole project folder (refused unless it holds a project.json). */
  removeProjectFolder(dir: string): Promise<void>
  pickFolder(opts: { title: string; defaultPath?: string }): Promise<string | null>
  /** "Save as" dialog; resolves to the chosen path, or null when cancelled. */
  saveFile(name: string, data: Uint8Array): Promise<string | null>
  reveal(path: string): Promise<void>
  /** Keep the computer awake during a long run (desktop app; call again with false when done). */
  keepAwake?(on: boolean): Promise<void>
  /** Desktop app updates from GitHub Releases (absent on Android). */
  updates?: DesktopUpdates
  /** Called when the window is about to close or the app goes to the background; the app saves. */
  onBeforeClose(fn: () => Promise<void>): void
}

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'none' }
  | {
      type: 'available'
      version: string
      url: string
      /** Installed with a package manager: the command that updates it (e.g. sudo pacman -Syu). */
      command?: string
    }
  | { type: 'downloading'; version: string; percent?: number }
  | { type: 'ready'; version: string }
  | { type: 'error'; message: string }

export interface DesktopUpdates {
  /** enabled: null until the user was asked. auto: this copy can install updates itself. */
  get(): Promise<{ enabled: boolean | null; mode: 'auto' | 'notify'; version: string }>
  set(enabled: boolean): Promise<void>
  /** Check now (turns updates on). */
  check(): Promise<void>
  /** Restart into the downloaded version. */
  install(): Promise<void>
  /** Open the release page in the browser. */
  openReleases(url?: string): Promise<void>
  onEvent(fn: (e: UpdateEvent) => void): void
}

declare global {
  interface Window {
    cardMaker?: DesktopBridge
  }
}

export const desktop = (): DesktopBridge | undefined =>
  typeof window === 'undefined' ? undefined : window.cardMaker

export const isDesktop = () => !!desktop()

/** Join path parts with '/', which Windows accepts too. */
export const joinPath = (...parts: string[]) =>
  parts
    .filter(Boolean)
    .map((p, i) => (i === 0 ? p.replace(/[\\/]+$/, '') : p.replace(/^[\\/]+|[\\/]+$/g, '')))
    .join('/')

/** One spelling per folder: forward slashes, no trailing slash. */
export const normPath = (p: string) => p.replace(/\\/g, '/').replace(/(?<=.)\/+$/, '')

/** How to show a path to the user. */
export const pathLabel = (p: string) => desktop()?.label?.(p) ?? p
