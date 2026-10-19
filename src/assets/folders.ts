import type { Asset } from '@/core/model/types'

export interface AssetGroup {
  /** Folder name; null = images without a folder. */
  folder: string | null
  assets: Asset[]
}

const newestFirst = (a: Asset, b: Asset) => b.createdAt - a.createdAt

/**
 * Images without a folder first, then one group per folder in `folders` order.
 * Folders that assets name but the list lacks are added at the end.
 */
export function groupAssets(assets: Asset[], folders: string[] = []): AssetGroup[] {
  const names = [...folders]
  for (const a of assets) if (a.folder && !names.includes(a.folder)) names.push(a.folder)
  const loose = assets.filter((a) => !a.folder || !names.includes(a.folder)).sort(newestFirst)
  return [
    { folder: null, assets: loose },
    ...names.map((f) => ({
      folder: f,
      assets: assets.filter((a) => a.folder === f).sort(newestFirst),
    })),
  ]
}

/** `name`, or `name 2`, `name 3`… so it doesn't clash with `taken`. */
export function uniqueFolderName(name: string, taken: string[]) {
  const base = name.trim() || 'Folder'
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base} ${n}`)) n++
  return `${base} ${n}`
}

/** Folder list after renaming `from` to `to` (order kept). */
export const renameInList = (folders: string[], from: string, to: string) =>
  folders.map((f) => (f === from ? to : f))

/** Asset ids whose folder changes when `from` is renamed or deleted. */
export const assetsInFolder = (assets: Asset[], folder: string) =>
  assets.filter((a) => a.folder === folder).map((a) => a.id)
