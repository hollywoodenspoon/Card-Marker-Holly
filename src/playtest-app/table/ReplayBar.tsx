import {
  ChevronFirst,
  ChevronLast,
  Download,
  LogOut,
  Pause,
  Play,
  StepBack,
  StepForward,
} from '@/ui/icons'
import { useMemo } from 'react'
import { Button, IconButton } from '@/ui/components/ui/button'
import { NativeSelect } from '@/ui/components/ui/input'
import { usePack } from './packContext'
import { exportReplay } from './replayFile'
import { usePlaytest, type Speed } from './usePlaytest'

/**
 * Watching a replay: play or pause, one action back or forward, the start of
 * the previous or next round, a scrubber, and the speed. Taps on the table
 * only look (and open the card preview).
 */
export function ReplayBar({ onLeave }: { onLeave: () => void }) {
  const replay = usePlaytest((s) => s.replay)!
  const speed = usePlaytest((s) => s.speed)
  const pack = usePack()
  const { seek, setReplayPlaying } = usePlaytest.getState()
  const { frames, i, playing, title } = replay
  // Where each round starts.
  const starts = useMemo(
    () => frames.flatMap((f, j) => (j === 0 || f.round !== frames[j - 1].round ? [j] : [])),
    [frames],
  )
  const prevRound = [...starts].reverse().find((j) => j < i) ?? 0
  const nextRound = starts.find((j) => j > i) ?? frames.length - 1
  const s = frames[i]
  return (
    <div
      className="flex shrink-0 flex-col gap-1.5 border-t bg-panel px-2 py-1.5 pb-safe"
      role="region"
      aria-label="Replay"
      data-testid="replay-bar"
    >
      <p className="truncate text-sm">
        <span className="font-semibold">Replay: {title}</span>{' '}
        {/* Frames can be caught mid-step, so only the round is shown (the callout says what happened). */}
        <span className="text-muted-foreground">
          Round {s.round} · {s.players[0].name} {s.players[0].points} – {s.players[1].points}{' '}
          {s.players[1].name}
        </span>
      </p>
      <input
        type="range"
        min={0}
        max={frames.length - 1}
        value={i}
        onChange={(e) => seek(Number(e.target.value))}
        className="h-6 w-full accent-[var(--accent)]"
        aria-label="Replay position"
        data-testid="replay-scrubber"
      />
      <div className="flex items-center gap-1 overflow-x-auto">
        <IconButton label="Previous round" onClick={() => seek(prevRound)}>
          <ChevronFirst />
        </IconButton>
        <IconButton label="One action back" onClick={() => seek(i - 1)} data-testid="replay-back">
          <StepBack />
        </IconButton>
        <IconButton
          label={playing ? 'Pause' : 'Play'}
          onClick={() => setReplayPlaying(!playing)}
          data-testid="replay-play"
        >
          {playing ? <Pause /> : <Play />}
        </IconButton>
        <IconButton
          label="One action forward"
          onClick={() => seek(i + 1)}
          data-testid="replay-forward"
        >
          <StepForward />
        </IconButton>
        <IconButton label="Next round" onClick={() => seek(nextRound)}>
          <ChevronLast />
        </IconButton>
        <span className="px-1 text-xs text-muted-foreground tabular-nums">
          {i + 1} / {frames.length}
        </span>
        <span className="flex-1" />
        <NativeSelect
          aria-label="Replay speed"
          className="w-auto"
          value={speed}
          onChange={(e) => usePlaytest.getState().setSpeed(e.target.value as Speed)}
        >
          <option value="slow">Slow</option>
          <option value="normal">Normal speed</option>
          <option value="fast">Fast</option>
          <option value="rush">Rush</option>
        </NativeSelect>
        <IconButton
          label="Save as a replay file"
          onClick={() =>
            exportReplay(
              { game: replay.game, moves: replay.moves, bots: [null, null], source: 'play' },
              pack.info.name,
            )
          }
          data-testid="replay-export"
        >
          <Download />
        </IconButton>
        <Button size="sm" variant="secondary" onClick={onLeave} data-testid="replay-leave">
          <LogOut /> Leave
        </Button>
      </div>
    </div>
  )
}
