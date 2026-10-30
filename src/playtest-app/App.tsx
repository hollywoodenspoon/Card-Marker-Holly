import { useCallback, useEffect, useRef, useState } from 'react'
import '@/help/help.css'
import { isActive, useWorkspace } from '@/app/workspace'
import { playtestDb } from '@/playtest/library'
import { readPack } from '@/playtest/pack'
import { toast } from '@/ui/components/feedback'
import { useLayout } from '@/ui/shell/useLayout'
import { HowToPlay } from './HowToPlay'
import { Library } from './Library'
import { GameView } from './table/GameView'
import { openPack, PackProvider, type OpenPack } from './table/packContext'
import { usePlaytest } from './table/usePlaytest'
import { useGameAutosave } from './useGameAutosave'

/**
 * The Play workspace (Hearthside Table): a library of game packs exported from the
 * Cards workspace, and a table to play them on. Everything stays in this browser (its
 * own database). The pack to open comes from the route ("#/play/pack=<id>"; "Playtest
 * now" goes there).
 */
export function App() {
  const phone = useLayout() === 'phone'
  const [open, setOpen] = useState<OpenPack | null>(null)
  const [help, setHelp] = useState(false)
  useGameAutosave(open?.id ?? null)

  const openId = useRef<string | null>(null)
  const openById = useCallback(async (id: string) => {
    if (openId.current === id) return
    const db = playtestDb()
    const row = await db.packs.get(id)
    if (!row) return void toast('That game pack is not in this browser. Import the file first.')
    try {
      const pack = openPack(id, readPack(new Uint8Array(await row.file.arrayBuffer())))
      const saved = await db.games.get(id)
      const pt = usePlaytest.getState()
      if (saved) pt.resume(id, saved.setup, saved.state, saved.past, saved.rules)
      else if (pt.packId !== id) pt.clear(id)
      openId.current = id
      setOpen((old) => {
        old?.close()
        return pack
      })
      if (useWorkspace.getState().pack !== id) useWorkspace.getState().setPack(id)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
    }
  }, [])

  const back = () => {
    openId.current = null
    setOpen((old) => {
      old?.close()
      return null
    })
    useWorkspace.getState().setPack(undefined)
  }

  // Follow the route: open its pack, or (Back, a link to "#/play") return to the library.
  useEffect(() => {
    const follow = (pack: string | undefined) => {
      if (pack) return void openById(pack)
      openId.current = null
      setOpen((old) => {
        old?.close()
        return null
      })
    }
    const first = useWorkspace.getState().pack
    if (first) follow(first)
    return useWorkspace.subscribe((s, prev) => {
      if (s.pack !== prev.pack) follow(s.pack)
    })
  }, [openById])

  // F1: how to play.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F1' || !isActive('play')) return
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
    </>
  )
}
