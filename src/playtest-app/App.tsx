import { useCallback, useEffect, useState } from 'react'
import { playtestDb } from '@/playtest/library'
import { readPack } from '@/playtest/pack'
import { FeedbackHost } from '@/ui/components/FeedbackHost'
import { toast } from '@/ui/components/feedback'
import { PwaToast } from '@/ui/pwa/PwaToast'
import { useLayout } from '@/ui/shell/useLayout'
import { HowToPlay } from './HowToPlay'
import { Library } from './Library'
import { GameView } from './table/GameView'
import { openPack, PackProvider, type OpenPack } from './table/packContext'
import { usePlaytest } from './table/usePlaytest'
import { useGameAutosave } from './useGameAutosave'

/** "#pack=<id>": the pack to open (Hearthside Cardworks' "Playtest now" links here). */
const packFromHash = () => new URLSearchParams(location.hash.slice(1)).get('pack')

/**
 * The Playtest app: a library of game packs exported from Hearthside Cardworks, and a
 * table to play them on. Everything stays in this browser (its own database).
 */
export function App() {
  const phone = useLayout() === 'phone'
  const [open, setOpen] = useState<OpenPack | null>(null)
  const [help, setHelp] = useState(false)
  useGameAutosave(open?.id ?? null)

  const openById = useCallback(async (id: string) => {
    const db = playtestDb()
    const row = await db.packs.get(id)
    if (!row) return void toast('That game pack is not in this browser. Import the file first.')
    try {
      const pack = openPack(id, readPack(new Uint8Array(await row.file.arrayBuffer())))
      const saved = await db.games.get(id)
      const pt = usePlaytest.getState()
      if (saved) pt.resume(id, saved.setup, saved.state, saved.past)
      else if (pt.packId !== id) pt.clear(id)
      setOpen((old) => {
        old?.close()
        return pack
      })
      if (packFromHash() !== id) history.replaceState(null, '', `#pack=${encodeURIComponent(id)}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const back = () => {
    setOpen((old) => {
      old?.close()
      return null
    })
    history.replaceState(null, '', location.pathname)
  }

  useEffect(() => {
    const fromHash = () => {
      const id = packFromHash()
      if (id) void openById(id)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [openById])

  // F1: how to play.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F1') return
      e.preventDefault()
      setHelp(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {open ? (
        <PackProvider value={open}>
          <GameView phone={phone} onBack={back} onHelp={() => setHelp(true)} />
        </PackProvider>
      ) : (
        <Library onOpen={(id) => void openById(id)} onHelp={() => setHelp(true)} />
      )}
      <HowToPlay open={help} onClose={() => setHelp(false)} />
      <PwaToast />
      <FeedbackHost />
    </>
  )
}
