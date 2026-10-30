import { useEffect } from 'react'
import { ArrowLeft, Loader2, Map as MapIcon, X } from '@/ui/icons'
import { Button } from '@/ui/components/ui/button'
import { SceneView } from '../scenes/SceneView'
import { answerRuntime, backScene, clickThing, stopRuntime, useRuntime } from './runtime'

/**
 * A game running, full screen over the Engine: the scene (areas invisible, glowing
 * as set), a message box, choices, and Back / Exit. Keys: Escape exits, Enter or
 * Space continues a message, 1–9 pick a choice.
 */
export function GamePlayer() {
  const running = useRuntime((s) => s.running)
  const game = useRuntime((s) => s.game)
  const sceneId = useRuntime((s) => s.sceneId)
  const hidden = useRuntime((s) => s.hidden)
  const message = useRuntime((s) => s.message)
  const choice = useRuntime((s) => s.choice)
  const status = useRuntime((s) => s.status)
  const away = useRuntime((s) => s.away)
  const canBack = useRuntime((s) => s.trail.length > 0 && !s.busy)

  useEffect(() => {
    if (!running) return
    const onKey = (e: KeyboardEvent) => {
      const st = useRuntime.getState()
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
        if (!st.message && !st.choice) stopRuntime()
        return
      }
      if (st.message && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        answerRuntime()
      } else if (st.choice && /^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1
        if (i < st.choice.options.length) answerRuntime(i)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [running])

  if (!running || !game) return null
  const scene = game.scenes.find((s) => s.id === sceneId) ?? null
  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col bg-black text-white"
      role="dialog"
      aria-label={`Playing ${game.name}`}
      data-testid="game-player"
    >
      <div className="pt-safe pl-safe pr-safe flex shrink-0 items-center gap-2 bg-black/80 px-2 py-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10"
          disabled={!canBack}
          onClick={backScene}
        >
          <ArrowLeft /> Back
        </Button>
        <span className="min-w-0 flex-1 truncate text-center text-sm text-white/70">
          {game.name}
          {scene ? ` · ${scene.name}` : ''}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={stopRuntime}
          data-testid="player-exit"
        >
          <X /> Exit
        </Button>
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
        {message !== null && (
          <button
            type="button"
            className="pb-safe absolute inset-x-3 bottom-3 rounded-xl border border-white/20 bg-black/80 p-4 text-left text-base leading-relaxed whitespace-pre-wrap shadow-2xl backdrop-blur sm:inset-x-[10%]"
            onClick={() => answerRuntime()}
            data-testid="player-message"
          >
            {message}
            <span className="mt-2 block text-right text-xs text-white/60">Continue ▸</span>
          </button>
        )}
        {choice && (
          <div
            className="pb-safe absolute inset-x-3 bottom-3 flex flex-col gap-2 rounded-xl border border-white/20 bg-black/80 p-4 shadow-2xl backdrop-blur sm:inset-x-[10%]"
            data-testid="player-choice"
          >
            {choice.prompt && <p className="text-base">{choice.prompt}</p>}
            {choice.options.map((o, i) => (
              <Button
                key={i}
                variant="secondary"
                className="min-h-11 justify-start"
                onClick={() => answerRuntime(i)}
              >
                <kbd className="text-xs opacity-60">{i + 1}</kbd> {o}
              </Button>
            ))}
          </div>
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
