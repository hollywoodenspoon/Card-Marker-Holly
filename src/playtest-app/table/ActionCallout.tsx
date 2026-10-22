import { FastForward } from '@/ui/icons'
import { useMemo } from 'react'
import { seenBy } from '@/playtest/actions'
import { Button } from '@/ui/components/ui/button'
import { cardsInLine, cues } from './cues'
import { PieceFace } from './Piece'
import { useFaces } from './packContext'
import { shownBefore, shownRules, usePlaytest } from './usePlaytest'

/** Pictures shown in the callout, at most. */
const MAX_CARDS = 3

/**
 * What just happened, one action at a time: the log line in large type and
 * the cards it is about. Shown while a move plays back (and in replays), and
 * with the last line in Rush. Tapping a card opens its preview; tapping the
 * text opens the log (on a phone).
 */
export function ActionCallout({
  onPreview,
  onLog,
}: {
  onPreview: (pieceId: string) => void
  onLog?: () => void
}) {
  const setup = usePlaytest((s) => s.setup)
  const state = usePlaytest((s) => s.state)
  const viewer = usePlaytest((s) => s.viewer)
  const playback = usePlaytest((s) => s.playback)
  const replay = usePlaytest((s) => s.replay)
  const rush = usePlaytest((s) => s.speed === 'rush' && !!s.rules && !s.replay)
  const shown = usePlaytest(shownRules)
  const before = usePlaytest(shownBefore)
  const faces = useFaces()
  const line = shown?.log.at(-1)
  const fresh = !!before && !!shown && shown.log.length > before.log.length
  const ids = useMemo(() => {
    if (!shown || !line || !fresh) return []
    return cardsInLine(shown, line.text, before ? cues(before, shown).glow : {})
  }, [shown, line, fresh, before])
  if (!setup || !state || !line || !(playback || replay || rush)) return null
  if (!fresh && !rush) return null
  const count = playback ? `${playback.i + 1} of ${playback.frames.length}` : null
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-2 z-[350] flex justify-center px-2"
      data-testid="action-callout"
    >
      <div
        className="pointer-events-auto flex max-w-[min(40rem,100%)] items-center gap-2 rounded-xl border bg-panel/95 px-3 py-2 shadow-xl backdrop-blur"
        role="status"
        aria-live="polite"
      >
        {ids.slice(0, MAX_CARDS).map((id) => {
          const p = state.pieces[id]
          if (!p) return null
          const f = faces[p.cardId]
          const seen = seenBy(setup, state, id, viewer)
          return (
            <button
              key={id}
              type="button"
              className="h-12 shrink-0 overflow-hidden rounded-md ring-1 ring-white/40 sm:h-20"
              style={{ aspectRatio: f ? `${f.w} / ${f.h}` : '63 / 88' }}
              onClick={() => seen !== 'back' && onPreview(id)}
              aria-label={seen === 'back' ? 'A face-down card' : `Show ${p.name}`}
            >
              <PieceFace
                piece={p}
                face={f}
                seen={seen === 'back' ? 'back' : 'face'}
                color={setup.seats[p.owner]?.color ?? '#64748b'}
              />
            </button>
          )
        })}
        <button
          type="button"
          className="line-clamp-3 min-w-0 text-left text-sm leading-snug font-medium sm:text-base"
          onClick={onLog}
          data-testid="action-callout-text"
        >
          {line.text}
        </button>
        {count && (
          <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums sm:inline">
            {count}
          </span>
        )}
        {playback && (
          <Button
            size="sm"
            variant="ghost"
            className="hidden shrink-0 sm:inline-flex"
            onClick={() => usePlaytest.getState().skip()}
            data-testid="action-skip"
          >
            <FastForward /> Skip
          </Button>
        )}
      </div>
    </div>
  )
}
