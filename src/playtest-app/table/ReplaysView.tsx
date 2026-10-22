import { ArrowLeft, Download, Eye, Pin, PinOff, Trash2, Upload, Zap } from '@/ui/icons'
import { useEffect, useRef, useState } from 'react'
import { BOT_NAMES } from '@/adventure/bot'
import {
  deleteReplay,
  deleteRush,
  listReplays,
  listRush,
  pinReplay,
  REPLAYS_KEPT,
  saveReplay,
  type ReplayRow,
  type RushRow,
} from '@/playtest/library'
import { toast } from '@/ui/components/feedback'
import { Button, IconButton } from '@/ui/components/ui/button'
import { usePack } from './packContext'
import { exportReplay, missingCards, readReplayFile } from './replayFile'
import { rushTally } from './rushTally'

const when = (t: number) =>
  new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Every kept replay of the pack, and its Rush batches. */
export function ReplaysView({
  packId,
  onClose,
  onWatch,
  onRush,
}: {
  packId: string
  onClose: () => void
  onWatch: (r: ReplayRow) => void
  onRush: (r: RushRow) => void
}) {
  const [replays, setReplays] = useState<ReplayRow[] | null>(null)
  const [batches, setBatches] = useState<RushRow[]>([])
  const [rev, setRev] = useState(0)
  useEffect(() => {
    let live = true
    void Promise.all([listReplays(packId), listRush(packId)]).then(([r, b]) => {
      if (!live) return
      // Pinned ones first, then the newest.
      setReplays([...r.filter((x) => x.pinned), ...r.filter((x) => !x.pinned)])
      setBatches(b)
    })
    return () => {
      live = false
    }
  }, [packId, rev])
  const refresh = () => setRev((n) => n + 1)
  const pack = usePack()
  const fileInput = useRef<HTMLInputElement>(null)
  const importFile = async (f: File) => {
    try {
      const row = readReplayFile(await f.text(), packId)
      await saveReplay(row)
      const missing = missingCards(row, pack.info.cards)
      toast(
        missing.length
          ? `Replay imported. ${missing.length} of its cards aren't in this pack, so their pictures are missing.`
          : 'Replay imported.',
      )
      refresh()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This replay file could not be read.')
    }
  }
  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-40 flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Replays"
      data-testid="replays-view"
    >
      <header className="app-topbar flex shrink-0 items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton label="Back" onClick={onClose}>
          <ArrowLeft />
        </IconButton>
        <div className="flex-1 text-sm font-semibold">Replays</div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => fileInput.current?.click()}
          data-testid="replay-import"
        >
          <Upload /> Import replay
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          data-testid="replay-import-input"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void importFile(f)
          }}
        />
      </header>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Rules games are kept when they end (or when you leave one after its first round). The
            newest {REPLAYS_KEPT} are kept; pin a replay to keep it for good. Save a replay as a
            file to share it, or to send it in when a game looks wrong.
          </p>
          {replays?.length === 0 && (
            <p className="rounded-xl border bg-panel p-4 text-sm text-muted-foreground">
              No replays yet. Finish a rules game, or keep a match from a Rush batch.
            </p>
          )}
          <ul className="flex flex-col gap-1" data-testid="replay-list">
            {replays?.map((r) => {
              const won = r.winner === null ? 'No winner' : `${r.names[r.winner]} wins`
              return (
                <li
                  key={r.id}
                  className="flex min-h-11 items-center gap-2 rounded-lg border bg-panel px-2 py-1"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {r.names[0]} vs {r.names[1]}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {won} · {r.points[0]}–{r.points[1]} · {r.rounds} rounds ·{' '}
                      {r.source === 'rush' ? 'Rush' : r.source === 'bot' ? 'with a bot' : 'people'}{' '}
                      · {when(r.savedAt)}
                    </span>
                  </span>
                  <IconButton
                    label={r.pinned ? 'Unpin' : 'Pin (keep for good)'}
                    active={r.pinned}
                    onClick={() => void pinReplay(r.id, !r.pinned).then(refresh)}
                  >
                    {r.pinned ? <PinOff /> : <Pin />}
                  </IconButton>
                  <IconButton
                    label="Save as a replay file"
                    onClick={() =>
                      exportReplay(
                        {
                          game: r.game,
                          moves: r.moves,
                          bots: r.bots,
                          source: r.source,
                          decks: r.decks,
                        },
                        pack.info.name,
                      )
                    }
                    data-testid="replay-export"
                  >
                    <Download />
                  </IconButton>
                  <IconButton label="Delete" onClick={() => void deleteReplay(r.id).then(refresh)}>
                    <Trash2 />
                  </IconButton>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onWatch(r)}
                    data-testid="replay-watch"
                  >
                    <Eye /> Watch
                  </Button>
                </li>
              )
            })}
          </ul>
          {batches.length > 0 && (
            <>
              <h3 className="mt-2 text-sm font-semibold">Rush batches</h3>
              <ul className="flex flex-col gap-1">
                {batches.map((b) => {
                  const t = rushTally(b)
                  return (
                    <li
                      key={b.id}
                      className="flex min-h-11 items-center gap-2 rounded-lg border bg-panel px-2 py-1"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {b.decks[0].name} {t.wins[0]} – {t.wins[1]} {b.decks[1].name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {t.played} games · {BOT_NAMES[b.levels[0]]} vs {BOT_NAMES[b.levels[1]]} ·{' '}
                          {when(b.savedAt)}
                        </span>
                      </span>
                      <IconButton
                        label="Delete"
                        onClick={() => void deleteRush(b.id).then(refresh)}
                      >
                        <Trash2 />
                      </IconButton>
                      <Button size="sm" variant="secondary" onClick={() => onRush(b)}>
                        <Zap /> Open
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
