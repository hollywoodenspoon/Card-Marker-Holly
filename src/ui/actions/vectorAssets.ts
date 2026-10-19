import { readImageFile } from '@/assets/imageAssets'
import { updateLibrary, useEditor } from '@/core/editor/editorStore'
import type { Asset } from '@/core/model/types'

/**
 * Save a picture made in the Vector Maker as an asset, keeping its editable
 * source. With `replaceId`, the existing asset is updated in place, so every
 * card using it changes too.
 */
export async function saveVectorAsset(opts: {
  file: File
  vectorDoc: string
  folder?: string
  replaceId?: string | null
}): Promise<Asset | null> {
  const s = useEditor.getState()
  if (!s.doc) return null
  const made = await readImageFile(opts.file, s.doc.project.id)
  const old = opts.replaceId ? s.library.assets[opts.replaceId] : undefined
  const asset: Asset = old
    ? {
        ...old,
        mime: made.mime,
        blob: made.blob,
        widthPx: made.widthPx,
        heightPx: made.heightPx,
        isVector: made.isVector,
        vectorDoc: opts.vectorDoc,
      }
    : { ...made, vectorDoc: opts.vectorDoc, ...(opts.folder && { folder: opts.folder }) }
  updateLibrary((l) => {
    l.assets[asset.id] = asset
  })
  return asset
}
