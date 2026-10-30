/** The open game's own pictures: listing (refreshed when one changes) and uploading. */
import { useEffect, useState } from 'react'
import { assets } from '../storage/assets'
import type { AssetRow } from '../storage/db'
import { useGame } from '../store/gameStore'
import { imagesChanged, useImageVersion } from './images'

export function useGameImages(): AssetRow[] {
  const gameId = useGame((s) => s.game.id)
  const v = useImageVersion((s) => s.v)
  const [rows, setRows] = useState<AssetRow[]>([])
  useEffect(() => {
    let live = true
    void assets.listGame(gameId).then((r) => live && setRows(r))
    return () => {
      live = false
    }
  }, [gameId, v])
  return rows
}

/** Add picture files to the open game. Returns the new ids. */
export async function uploadImages(files: FileList | File[], folder?: string) {
  const gameId = useGame.getState().game.id
  const ids: string[] = []
  for (const f of Array.from(files)) {
    if (!f.type.startsWith('image/')) continue
    ids.push(await assets.putImage(f, f.name.replace(/\.[^.]+$/, ''), gameId, folder))
  }
  imagesChanged()
  return ids
}
