import type { BrowserWindow } from 'electron'

/** Cozy Edition never goes online: stands in for updater.ts in its build. */
export const updatesEnabled = (): boolean | null => false
export function initUpdates(
  _win: () => BrowserWindow | null,
  _beforeInstall: () => Promise<void>,
) {}
/** No update host is ever allowed (stands in for updateHosts.ts). */
export const isUpdateHost = (_url: string) => false
