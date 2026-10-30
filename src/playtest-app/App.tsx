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
  // A game's cards belong to the Engine's card loader (shared with the Engine), so
  // only packs opened here are closed here.
  const owned = useRef(false)
  const show = useCallback((pack: OpenPack | null, own: boolean) => {
    setOpen((old) => {
      if (old !== pack && owned.current) old?.close()
      return pack
    })
    owned.current = own
  }, [])
  const resumeOrClear = async (id: string) => {
    const saved = await playtestDb().games.get(id)
    const pt = usePlaytest.getState()
    if (saved) pt.resume(id, saved.setup, saved.state, saved.past, saved.rules)
    else if (pt.packId !== id) pt.clear(id)
  }

  const openById = useCallback(
    async (id: string) => {
      if (openId.current === id) return
      const db = playtestDb()
      const row = await db.packs.get(id)
      if (!row) return void toast('That game pack is not in this browser. Import the file first.')
      try {
        const pack = openPack(id, readPack(new Uint8Array(await row.file.arrayBuffer())))
        await resumeOrClear(id)
        openId.current = id
        show(pack, true)
        if (useWorkspace.getState().pack !== id) useWorkspace.getState().setPack(id)
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e))
      }
    },
    [show],
  )

  /** An Engine game: its merged card sources and its own decks, keyed by the game's id. */
  const openGame = useCallback(
    async (id: string) => {
      if (openId.current === id) return
      openId.current = id
      try {
        const { openGameForPlay } = await import('@/engine/play/openForPlay')
        const pack = await openGameForPlay(id)
        if (openId.current !== id) return
        if (!pack) {
          openId.current = null
          return void toast('That game has no cards yet. Add a card source in the Engine.')
        }
        await resumeOrClear(id)
        show(pack, false)
      } catch (e) {
        openId.current = null
        toast(e instanceof Error ? e.message : String(e))
      }
    },
    [show],
  )

  const back = () => {
    openId.current = null
    show(null, false)
    useWorkspace.getState().setPack(undefined)
  }

  // Follow the route: open its pack or game, or (Back, a link to "#/play") return to the library.
  useEffect(() => {
    const follow = (pack: string | undefined, game: string | undefined) => {
      if (game) return void openGame(game)
      if (pack) return void openById(pack)
      openId.current = null
      show(null, false)
    }
    const first = useWorkspace.getState()
    if (first.pack || first.game) follow(first.pack, first.game)
    return useWorkspace.subscribe((s, prev) => {
      if (s.pack !== prev.pack || s.game !== prev.game) follow(s.pack, s.game)
    })
  }, [openById, openGame, show])

  // The Engine reloaded the open game's cards (a source changed): show the new set.
  useEffect(() => {
    const game = useWorkspace.getState().game
    if (!open || owned.current || !game) return
    let stop: (() => void) | undefined
    let live = true
    void import('@/engine/cards/gameCards').then(({ useGameCards }) => {
      if (!live) return
      stop = useGameCards.subscribe((s) => {
        if (s.gameId === game && s.status === 'ready' && s.open && s.open !== open)
          show(s.open, false)
      })
    })
    return () => {
      live = false
      stop?.()
    }
  }, [open, show])

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
        <Library
          onOpen={(id) => void openById(id)}
          onOpenGame={(id) => useWorkspace.getState().playGame(id)}
          onHelp={() => setHelp(true)}
        />
      )}
      <HowToPlay open={help} onClose={() => setHelp(false)} />
    </>
  )
}
