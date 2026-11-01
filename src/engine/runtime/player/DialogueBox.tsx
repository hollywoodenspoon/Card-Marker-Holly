import { useEffect, useState } from 'react'
import { usePortrait } from '../../portraits/render'
import { useLine } from '../lines'
import { answerRuntime, useRuntime } from '../runtime'
import { setFinishTyping, skipTyping } from './typing'

const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Text that types itself out; a click or Enter shows it all. */
function useTyping(text: string, speed: number) {
  const instant = reduced() || speed <= 0
  const [shown, setShown] = useState(() => (instant ? text.length : 0))
  const [prev, setPrev] = useState(text)
  if (prev !== text) {
    setPrev(text)
    setShown(instant ? text.length : 0)
  }
  const done = instant || shown >= text.length
  useEffect(() => {
    if (done) return
    const t = setInterval(() => setShown((n) => Math.min(text.length, n + 1)), 1000 / speed)
    return () => clearInterval(t)
  }, [text, done, speed])
  useEffect(() => {
    setFinishTyping(() => {
      if (done) return false
      setShown(text.length)
      return true
    })
    return () => setFinishTyping(null)
  }, [text, done])
  return { text: instant ? text : text.slice(0, shown), done }
}

/**
 * The visual-novel box at the bottom: the speaker's portrait and name (in their
 * colour), the words typing out, and the choices when the steps ask.
 */
export function DialogueBox() {
  const game = useRuntime((s) => s.game)
  const message = useRuntime((s) => s.message)
  const speaker = useRuntime((s) => s.speaker)
  const choice = useRuntime((s) => s.choice)
  const portrait = usePortrait(game, speaker?.character, speaker?.expression)
  const text = message ?? choice?.prompt ?? ''
  const t = useLine()
  const typing = useTyping(text, game?.settings.textSpeed ?? 40)
  if (message === null && !choice) return null
  return (
    <div className="pb-safe absolute inset-x-2 bottom-2 flex items-end gap-3 sm:inset-x-[8%]">
      {portrait && (
        <img
          src={portrait}
          alt={speaker?.name ?? ''}
          className="hs-pop pointer-events-none hidden max-h-[45dvh] w-auto max-w-[30%] object-contain drop-shadow-2xl sm:block"
        />
      )}
      <div
        className="relative min-w-0 flex-1 rounded-xl border border-white/20 bg-black/80 p-4 shadow-2xl backdrop-blur"
        data-testid={choice ? 'player-choice' : 'player-message'}
      >
        {speaker?.name && (
          <div className="mb-1 flex items-center gap-2">
            {portrait && (
              <img src={portrait} alt="" className="size-10 rounded-full object-cover sm:hidden" />
            )}
            <span className="text-base font-semibold" style={{ color: speaker.color }}>
              {speaker.name}
            </span>
          </div>
        )}
        {message !== null ? (
          <button
            type="button"
            className="block w-full text-left text-base leading-relaxed whitespace-pre-wrap"
            onClick={() => {
              if (!skipTyping()) answerRuntime()
            }}
          >
            {typing.text}
            <span className="mt-2 block text-right text-xs text-white/60">
              {typing.done ? t('dialogue.continue') : '…'}
            </span>
          </button>
        ) : (
          choice && (
            <div className="flex flex-col gap-2">
              {choice.prompt && (
                <p className="text-base leading-relaxed whitespace-pre-wrap">{typing.text}</p>
              )}
              {choice.options.map((o, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex min-h-11 items-center gap-2 rounded-md bg-white/10 px-3 text-left text-sm hover:bg-white/20"
                  onClick={() => answerRuntime(i)}
                >
                  <kbd className="text-xs opacity-60">{i + 1}</kbd> {o}
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
