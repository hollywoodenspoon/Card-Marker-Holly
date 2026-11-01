import { newId } from '@/core/model/ids'
import { Section } from '@/ui/components/fields'
import { Button } from '@/ui/components/ui/button'
import { Label } from '@/ui/components/ui/input'
import { Plus } from '@/ui/icons'
import { adventureLeague, newRelease, newTournament } from '../../model/league'
import { useGame } from '../../store/gameStore'
import { ListRow } from './ListRow'

/** The league: levels and tracks, and the list of tournaments. */
export function LeaguePanel() {
  const league = useGame((s) => s.game.league)
  const view = useGame((s) => s.view)
  const devTools = useGame((s) => s.game.settings.devTools)
  const { commit, setView } = useGame.getState()
  const isOpen = (kind: string, id: string) => view.kind === kind && 'id' in view && view.id === id
  const empty = !league.levels.length && !league.tournaments.length
  return (
    <div className="flex flex-col" data-testid="league-panel">
      <Section title="League">
        <p className="text-xs text-muted-foreground">
          Duelists, tournaments, points and prizes. Off: the game has no league and weeks pass
          without one.
        </p>
        <Label className="flex min-h-11 items-center gap-2 md:min-h-0">
          <input
            type="checkbox"
            checked={league.enabled}
            onChange={(e) => commit((g) => void (g.league.enabled = e.target.checked))}
          />
          The league is on
        </Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setView({ kind: 'league' })}
          data-testid="open-league"
        >
          Levels, points and names
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (
              !empty &&
              !window.confirm('Replace the whole league with the Adventure Scuffle! starting values?')
            )
              return
            commit((g) => void (g.league = adventureLeague()))
          }}
          data-testid="league-template"
        >
          Fill with Adventure Scuffle! values
        </Button>
      </Section>
      <Section title="Tournaments">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const t = newTournament(
              `Tournament ${useGame.getState().game.league.tournaments.length + 1}`,
              useGame.getState().game.league.levels,
            )
            commit((g) => void g.league.tournaments.push(t))
            setView({ kind: 'tournament', id: t.id })
          }}
        >
          <Plus /> Tournament
        </Button>
        <ul className="flex flex-col gap-1" data-testid="tournaments">
          {league.tournaments.map((t) => (
            <ListRow
              key={t.id}
              name={t.name}
              detail={`${t.players} players · ${t.stages.length} stage${t.stages.length === 1 ? '' : 's'}`}
              active={isOpen('tournament', t.id)}
              onOpen={() => setView({ kind: 'tournament', id: t.id })}
              onDuplicate={() =>
                commit(
                  (g) =>
                    void g.league.tournaments.push({
                      ...structuredClone(t),
                      id: newId(),
                      name: `${t.name} copy`,
                    }),
                )
              }
              onDelete={() =>
                commit(
                  (g) =>
                    void (g.league.tournaments = g.league.tournaments.filter((x) => x.id !== t.id)),
                )
              }
            />
          ))}
        </ul>
      </Section>
      <Section title="Cards">
        <Button size="sm" variant="outline" onClick={() => setView({ kind: 'bans' })}>
          Bans {league.bans.enabled ? '' : '(off)'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setView({ kind: 'market' })}>
          Card market {league.market.enabled ? '' : '(off)'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const r = newRelease(
              `Release ${useGame.getState().game.league.releases.length + 1}`,
            )
            commit((g) => void g.league.releases.push(r))
            setView({ kind: 'release', id: r.id })
          }}
        >
          <Plus /> Release
        </Button>
        <ul className="flex flex-col gap-1" data-testid="releases">
          {league.releases.map((r) => (
            <ListRow
              key={r.id}
              name={r.name}
              detail={`${r.fixed.length} fixed + ${r.random} random`}
              active={isOpen('release', r.id)}
              onOpen={() => setView({ kind: 'release', id: r.id })}
              onDuplicate={() =>
                commit(
                  (g) =>
                    void g.league.releases.push({
                      ...structuredClone(r),
                      id: newId(),
                      name: `${r.name} copy`,
                    }),
                )
              }
              onDelete={() =>
                commit(
                  (g) => void (g.league.releases = g.league.releases.filter((x) => x.id !== r.id)),
                )
              }
            />
          ))}
        </ul>
      </Section>
      {devTools && (
        <Section title="Developer tools">
          <Button size="sm" variant="outline" onClick={() => setView({ kind: 'simulator' })}>
            Season simulator
          </Button>
        </Section>
      )}
    </div>
  )
}
