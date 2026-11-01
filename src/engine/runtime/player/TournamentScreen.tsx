import { useState } from 'react'
import { cn } from '@/lib/cn'
import {
  entrants,
  openMatches,
  placings,
  roundLabel,
  standings,
  type BMatch,
  type Tourney,
} from '../../league/bracket'
import { PLAYER } from '../../league/tournaments'
import { money } from '../../model/economy'
import { useLine } from '../lines'
import { closeScreen, useRuntime } from '../state'
import { Panel, PlayerButton } from './Panel'

/**
 * A tournament the player is in: the match to play (or forfeit), the round and the
 * standings; once out, a round-by-round view with a skip; at the end, the results.
 * It answers the running steps with a pick: 0 play / next round, 1 forfeit / skip.
 */
export function TournamentScreen() {
  const game = useRuntime((s) => s.game)
  const active = useRuntime((s) => s.world?.active)
  const line = useLine()
  const [sure, setSure] = useState(false)
  if (!game || !active) return null
  const t = active.tourney
  const you = line('tourney.you')
  const name = (id: string) =>
    id === PLAYER ? you : (t.contenders.find((c) => c.id === id)?.name ?? id)
  const def = game.league.tournaments.find((d) => d.id === active.defId)

  if (active.phase === 'done') {
    const order = placings(t)
    return (
      <Panel
        title={`${active.name} · ${line('tourney.results')}`}
        testId="player-tournament"
        footer={
          <PlayerButton primary className="ml-auto" onClick={() => closeScreen(0)}>
            {line('tourney.close')}
          </PlayerButton>
        }
      >
        <ol className="flex flex-col gap-1">
          {order.map((id, i) => {
            const pts = def?.pointsByPlace[i]
            const prize = def ? Math.round(((def.prizePool ?? 0) * (def.prizeSplit[i] ?? 0)) / 100) : 0
            return (
              <li
                key={id}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
                  id === PLAYER ? 'bg-accent/30 font-semibold' : 'bg-white/5',
                )}
              >
                <span className="w-7 text-right text-white/60">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{name(id)}</span>
                {pts ? <span className="text-white/70">{pts} pts</span> : null}
                {prize > 0 ? <span className="text-amber-300">{money(prize, game.economy)}</span> : null}
              </li>
            )
          })}
        </ol>
      </Panel>
    )
  }

  const round = t.matches.filter((m) => m.stage === t.stage && m.round === t.round)
  const mine = openMatches(t).find((m) => m.b !== null && (m.a === PLAYER || m.b === PLAYER))
  const playing = active.phase === 'play' && !!mine
  const opp = mine ? (mine.a === PLAYER ? mine.b! : mine.a) : null
  const score = active.current?.matchId === mine?.id ? active.current!.score : [0, 0]
  const header = (
    <p className="mb-3 text-sm text-white/70">
      {roundLabel(t)} · {entrants(t).length} / {t.contenders.length}
    </p>
  )

  return (
    <Panel
      title={active.name}
      wide
      testId="player-tournament"
      footer={
        playing && mine ? (
          sure ? (
            <>
              <span className="flex-1 text-sm text-amber-300">{line('tourney.sure')}</span>
              <PlayerButton onClick={() => setSure(false)}>{line('tourney.back')}</PlayerButton>
              <PlayerButton
                onClick={() => {
                  setSure(false)
                  closeScreen(1)
                }}
              >
                {line('tourney.forfeit')}
              </PlayerButton>
            </>
          ) : (
            <>
              <PlayerButton onClick={() => setSure(true)}>{line('tourney.forfeit')}</PlayerButton>
              <PlayerButton primary className="ml-auto" onClick={() => closeScreen(0)}>
                {line('tourney.play')}
              </PlayerButton>
            </>
          )
        ) : (
          <>
            <PlayerButton onClick={() => closeScreen(1)}>{line('tourney.skip')}</PlayerButton>
            <PlayerButton primary className="ml-auto" onClick={() => closeScreen(0)}>
              {line('tourney.next')}
            </PlayerButton>
          </>
        )
      }
    >
      {header}
      {playing && mine && opp && (
        <div className="mb-4 rounded-lg bg-white/10 p-3" data-testid="tournament-yourmatch">
          <p className="text-base font-semibold">
            {line('tourney.yourMatch', { name: name(opp), games: mine.bestOf })}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {you} {score[0]} – {score[1]} {name(opp)}
          </p>
        </div>
      )}
      {!playing && active.phase === 'spectate' && (
        <p className="mb-3 text-sm text-amber-300">{line('tourney.spectate')}</p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <section>
          <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-white/60 uppercase">
            {line('tourney.thisRound')}
          </h3>
          <ul className="flex flex-col gap-1">
            {round.map((m) => (
              <MatchRow key={m.id} m={m} name={name} />
            ))}
          </ul>
        </section>
        <Standings t={t} name={name} title={line('tourney.standings')} />
      </div>
    </Panel>
  )
}

function MatchRow({ m, name }: { m: BMatch; name: (id: string) => string }) {
  const mineRow = m.a === PLAYER || m.b === PLAYER
  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
        mineRow ? 'bg-accent/25' : 'bg-white/5',
      )}
    >
      <span className={cn('min-w-0 flex-1 truncate', m.winner === m.a && 'font-semibold')}>
        {name(m.a)}
      </span>
      <span className="shrink-0 text-white/60 tabular-nums">
        {m.b === null ? 'bye' : m.winner ? `${m.score[0]}–${m.score[1]}` : 'vs'}
      </span>
      <span className={cn('min-w-0 flex-1 truncate text-right', m.winner === m.b && 'font-semibold')}>
        {m.b === null ? '' : name(m.b)}
      </span>
    </li>
  )
}

function Standings({ t, name, title }: { t: Tourney; name: (id: string) => string; title: string }) {
  const kind = t.stages[t.stage]?.kind
  if (kind === 'single' || kind === 'double') return null
  const rows = standings(t, t.stage, entrants(t)).slice(0, 12)
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-white/60 uppercase">{title}</h3>
      <ol className="flex flex-col gap-1">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1 text-sm',
              r.id === PLAYER ? 'bg-accent/25' : 'bg-white/5',
            )}
          >
            <span className="w-6 text-right text-white/60">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{name(r.id)}</span>
            <span className="text-white/70 tabular-nums">
              {r.wins}–{r.losses}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
