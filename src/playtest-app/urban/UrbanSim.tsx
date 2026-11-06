import { useEffect, useRef, useState } from 'react'
import { Button } from '@/ui/components/ui/button'
import type { UwLevel } from '@/urban/bot'
import type { UwPackCard } from '@/urban/cards'
import { count, emptyTally, playOne, rng, type SimTally } from '@/urban/sim'

const CHUNK = 5
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–')

/** Many fast bot vs bot games, run in small chunks so the page stays responsive. */
export function UrbanSim({ cards, onClose }: { cards: UwPackCard[]; onClose: () => void }) {
  const [levels, setLevels] = useState<[UwLevel, UwLevel]>(['normal', 'normal'])
  const [n, setN] = useState(100)
  const [tally, setTally] = useState<SimTally | null>(null)
  const [running, setRunning] = useState(false)
  const stop = useRef(false)
  useEffect(
    () => () => {
      stop.current = true
    },
    [],
  )

  const run = () => {
    const t = emptyTally()
    const rand = rng(Date.now())
    stop.current = false
    setRunning(true)
    let g = 0
    const tick = () => {
      if (stop.current) return setRunning(false)
      for (let k = 0; k < CHUNK && g < n; k++, g++) {
        const { end, capped } = playOne(cards, levels, g, rand)
        count(t, end, capped)
      }
      setTally({ ...t, wins: [...t.wins], by: { ...t.by } })
      if (g < n) setTimeout(tick, 0)
      else setRunning(false)
    }
    tick()
  }

  const levelPick = (seat: 0 | 1) => (
    <label className="flex flex-1 flex-col gap-1 text-sm">
      Bot {seat + 1}
      <select
        className="h-11 rounded-md border bg-panel px-2 md:h-9"
        value={levels[seat]}
        disabled={running}
        onChange={(e) => {
          const v = e.target.value as UwLevel
          setLevels((l) => (seat === 0 ? [v, l[1]] : [l[0], v]))
        }}
      >
        <option value="normal">Normal</option>
        <option value="easy">Easy</option>
      </select>
    </label>
  )

  const t = tally
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 overflow-auto p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Simulation</h2>
        <Button size="sm" variant="secondary" onClick={onClose}>
          Back
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Bots play each other with no animation. Who goes first alternates.
      </p>
      <div className="flex gap-2">
        {levelPick(0)}
        {levelPick(1)}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Games
        <select
          className="h-11 rounded-md border bg-panel px-2 md:h-9"
          value={n}
          disabled={running}
          onChange={(e) => setN(Number(e.target.value))}
        >
          {[100, 500, 1000].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </label>
      {running ? (
        <Button variant="secondary" onClick={() => (stop.current = true)}>
          Stop
        </Button>
      ) : (
        <Button onClick={run}>Run</Button>
      )}
      {t && (
        <div className="rounded-md border bg-panel p-3 text-sm" data-testid="uw-sim-result">
          <p className="font-medium">
            {t.games} of {n} games{running ? '…' : ''}
          </p>
          <table className="mt-2 w-full text-left tabular-nums">
            <tbody>
              <tr>
                <td>Bot 1 wins</td>
                <td>
                  {t.wins[0]} ({pct(t.wins[0], t.games)})
                </td>
              </tr>
              <tr>
                <td>Bot 2 wins</td>
                <td>
                  {t.wins[1]} ({pct(t.wins[1], t.games)})
                </td>
              </tr>
              <tr>
                <td>Draws</td>
                <td>
                  {t.draws} ({pct(t.draws, t.games)})
                </td>
              </tr>
              <tr>
                <td>First player wins</td>
                <td>{pct(t.firstWins, t.games - t.draws)} of decided games</td>
              </tr>
              <tr>
                <td>Average turns</td>
                <td>{t.games ? (t.turns / t.games).toFixed(1) : '–'}</td>
              </tr>
              <tr>
                <td>Won by</td>
                <td>
                  Battleline {t.by.battleline}, Objective {t.by.objective}, Attrition{' '}
                  {t.by.attrition}
                  {t.by.cap > 0 && `, stopped at the move limit ${t.by.cap}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
