import { assetsInFolder, renameInList, uniqueFolderName } from '@/assets/folders'
import { IMAGE_ACCEPT } from '@/assets/imageAssets'
import { commit, updateLibrary, useEditor } from '@/core/editor/editorStore'
import { importImages, pickFiles } from './imageActions'

const folders = () => useEditor.getState().doc?.project.assetFolders ?? []

/** Add a folder (name made unique); returns its name. */
export function addAssetFolder(name: string) {
  const n = uniqueFolderName(name, folders())
  commit((d) => {
    d.project.assetFolders = [...(d.project.assetFolders ?? []), n]
  })
  return n
}

export function renameAssetFolder(from: string, to: string) {
  const name = to.trim()
  if (!name || name === from) return
  const n = uniqueFolderName(
    name,
    folders().filter((f) => f !== from),
  )
  const ids = assetsInFolder(Object.values(useEditor.getState().library.assets), from)
  commit((d) => {
    d.project.assetFolders = renameInList(d.project.assetFolders ?? [from], from, n)
  })
  updateLibrary((l) => {
    for (const id of ids) l.assets[id].folder = n
  })
}

/** Remove a folder; its images move to the top level (they are not deleted). */
export function deleteAssetFolder(name: string) {
  const ids = assetsInFolder(Object.values(useEditor.getState().library.assets), name)
  commit((d) => {
    d.project.assetFolders = (d.project.assetFolders ?? []).filter((f) => f !== name)
  })
  updateLibrary((l) => {
    for (const id of ids) delete l.assets[id].folder
  })
}

/** Put images in a folder (null = no folder). */
export function moveAssetsToFolder(ids: string[], folder: string | null) {
  if (folder && !folders().includes(folder))
    commit((d) => {
      d.project.assetFolders = [...(d.project.assetFolders ?? []), folder]
    })
  updateLibrary((l) => {
    for (const id of ids) {
      const a = l.assets[id]
      if (!a) continue
      if (folder) a.folder = folder
      else delete a.folder
    }
  })
}

export const uploadImages = async (folder?: string) =>
  importImages(await pickFiles(IMAGE_ACCEPT), folder)

/** Ask for a name and add a folder. */
export function newAssetFolder() {
  const name = prompt('Folder name', 'New folder')?.trim()
  if (name) addAssetFolder(name)
}
