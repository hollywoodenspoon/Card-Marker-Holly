/**
 * The desktop app's bridge to the file system (electron/preload.ts puts it on
 * `window.cardMaker`). The web build has no bridge and stores everything in
 * the browser.
 */
export interface DesktopBridge {
  platform: string
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
  /** Called when the window is about to close; the app saves, then calls `done`. */
  onBeforeClose(fn: () => Promise<void>): void
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
