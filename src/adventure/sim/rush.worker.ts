/// <reference lib="webworker" />
/** Plays Rush games off the main thread: every game `g` with g % of === part. */
import { rushGame, type RushJob } from './rush'

interface Start {
  job: RushJob
  games: number
  part: number
  of: number
}

self.onmessage = (e: MessageEvent<Start>) => {
  const { job, games, part, of } = e.data
  for (let g = part; g < games; g += of) {
    const r = rushGame(job, g)
    // The final state is rebuilt from the moves when a replay is opened.
    const { state, ...match } = r.match
    self.postMessage({
      type: 'game',
      result: {
        ...r,
        match: {
          ...match,
          winner: state.winner?.seat ?? null,
          points: [state.players[0].points, state.players[1].points],
          rounds: state.round,
        },
      },
    })
  }
  self.postMessage({ type: 'done' })
}
