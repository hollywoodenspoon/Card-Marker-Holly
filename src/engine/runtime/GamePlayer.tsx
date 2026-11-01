import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Backpack,
  CalendarDays,
  Loader2,
  Map as MapIcon,
  Save,
  ScrollText,
  X,
} from '@/ui/icons'
import { SceneView } from '../scenes/SceneView'
import { DialogueBox } from './player/DialogueBox'
import { skipTyping } from './player/typing'
import { DeckScreen } from './player/DeckScreen'
import { BagScreen, LogScreen, SavesScreen } from './player/MenuScreens'
import { BoosterReveal } from './player/BoosterReveal'
import { Panel, PlayerButton } from './player/Panel'
import { ShopScreen } from './player/ShopScreen'
import { ActivityScreen, CalendarScreen } from './player/WeekScreens'
import {
  answerRuntime,
  backScene,
  clickThing,
  closeScreen,
  stopRuntime,
  useRuntime,
} from './runtime'

type Menu = 'bag' | 'calendar' | 'log' | 'saves' | null

/**
 * A game running, full screen over the Engine: the scene (areas invisible, glowing
 * as set), the dialogue box with choices, the screens the steps open (shop,
 * booster, deck, activities, calendar), and a menu: calendar, bag, log, save and
 * load. Keys: Escape closes a menu or exits, Enter or Space continues the
 * dialogue, 1–9 pick a choice.
 */
export function GamePlayer() {
  const running = useRuntime((s) => s.running)
  const game = useRuntime((s) => s.game)
  const sceneId = useRuntime((s) => s.sceneId)
  const hidden = useRuntime((s) => s.hidden)
  const screen = useRuntime((s) => s.screen)
  const status = useRuntime((s) => s.status)
  const away = useRuntime((s) => s.away)
  const ended = useRuntime((s) => s.ended)
  const canBack = useRuntime((s) => s.trail.length > 0 && !s.busy)
  const [menu, setMenu] = useState<Menu>(null)

  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      const st = useRuntime.getState()
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (menu) setMenu(null)
        else if (st.screen?.kind === 'calendar') closeScreen()
        else if (!st.message && !st.choice && !st.screen) stopRuntime()
        return
      }
      if (menu || st.screen) return
      if (st.message !== null && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        if (!skipTyping()) answerRuntime()
      } else if (st.choice && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        if (i < st.choice.options.length) answerRuntime(i)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [running, menu])

  if (!running || !game) return null
  const scene = game.scenes.find((s) => s.id === sceneId) ?? null
  const usesWeeks = game.calendar.activities.length > 0 || game.calendar.events.length > 0
  const usesBag =
    !!game.economy.money ||
    game.items.length > 0 ||
    game.boosters.length > 0 ||
    game.shops.length > 0
  const menuButton = (id: Exclude<Menu, null>, label: string, Icon: typeof Save) => (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setMenu(menu === id ? null : id)}
      className="grid size-11 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white md:size-9"
      data-testid={`player-menu-${id}`}
    >
      <Icon className="size-5" />
    </button>
  )
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black text-white"
      role="dialog"
      aria-label={`Playing ${game.name}`}
      data-testid="game-player"
    >
      <div className="pt-safe pl-safe pr-safe flex shrink-0 items-center gap-1 bg-black/80 px-2 py-1">
        <PlayerButton
          className="bg-transparent"
          aria-label="Back"
          disabled={!canBack}
          onClick={backScene}
        >
          <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back</span>
        </PlayerButton>
        <span className="min-w-0 flex-1 truncate text-center text-sm text-white/70">
          {game.name}
          {scene ? ` · ${scene.name}` : ''}
        </span>
        {usesWeeks && menuButton('calendar', 'Calendar', CalendarDays)}
        {usesBag && menuButton('bag', 'Bag', Backpack)}
        {menuButton('log', 'Log', ScrollText)}
        {menuButton('saves', 'Save and load', Save)}
        <PlayerButton
          className="bg-transparent"
          aria-label="Exit"
          onClick={stopRuntime}
          data-testid="player-exit"
        >
          <X className="size-4" /> <span className="hidden sm:inline">Exit</span>
        </PlayerButton>
      </div>
      <div className="relative min-h-0 flex-1">
        {!scene ? (
          <Centre>This game has no scenes yet. Add one in the Scenes panel.</Centre>
        ) : scene.kind === 'picture' ? (
          <SceneView
            scene={scene}
            mode="play"
            hidden={hidden}
            className="absolute inset-0 h-full w-full"
            onAreaClick={(a) => clickThing(a.events)}
            onObjectClick={(o) => clickThing(o.events)}
          />
        ) : (
          <Centre>
            <MapIcon className="mx-auto mb-2 size-8 opacity-70" />
            {scene.name} is a map scene. Walking around maps while playing comes in a later update;
            its “scene starts” events still run.
          </Centre>
        )}
        {away && <Centre>The card game is open on the table. Come back when it’s over.</Centre>}
        {status && (
          <div
            role="status"
            className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/75 px-4 py-1.5 text-sm"
          >
            <Loader2 className="size-4 animate-spin" /> {status}
          </div>
        )}
        <DialogueBox />
        {screen?.kind === 'shop' && <ShopScreen shopId={screen.id} />}
        {screen?.kind === 'booster' && (
          <BoosterReveal pack={screen.pack} onDone={() => closeScreen()} />
        )}
        {screen?.kind === 'deck' && <DeckScreen deckId={screen.deckId} />}
        {screen?.kind === 'activity' && (
          <ActivityScreen options={screen.options} forced={screen.forced} />
        )}
        {screen?.kind === 'calendar' && <CalendarScreen onClose={() => closeScreen()} />}
        {menu === 'calendar' && <CalendarScreen onClose={() => setMenu(null)} />}
        {menu === 'bag' && <BagScreen onClose={() => setMenu(null)} />}
        {menu === 'log' && <LogScreen onClose={() => setMenu(null)} />}
        {menu === 'saves' && <SavesScreen onClose={() => setMenu(null)} />}
        {ended !== null && !menu && (
          <Panel title="The end" testId="player-ended">
            <p className="mb-4 text-base leading-relaxed whitespace-pre-wrap">{ended}</p>
            <div className="flex flex-wrap gap-2">
              <PlayerButton onClick={() => setMenu('saves')}>Load a save</PlayerButton>
              <PlayerButton primary onClick={stopRuntime}>
                Exit
              </PlayerButton>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}

function Centre({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6">
      <p className="max-w-md rounded-xl bg-black/70 p-4 text-center text-sm text-white/85">
        {children}
      </p>
    </div>
  )
}
