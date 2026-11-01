import { describe, expect, it } from 'vitest'
import { effect, ifStep, type Step } from '../model/events'
import type { RunContext, World } from './pieces'
import { runSteps } from './run'

function ctx(world: Partial<World>) {
  const log: string[] = []
  const c = {
    getVar: () => undefined,
    setVar: () => undefined,
    random: () => 0.5,
    goToScene: () => undefined,
    setObjectVisible: () => undefined,
    showMessage: async (t: string) => void log.push(`say ${t}`),
    choose: async () => 0,
    wait: async () => undefined,
    runRecipe: async () => undefined,
    call: async () => undefined,
    stopped: () => false,
    world: world as World,
  } as RunContext
  return { c, log }
}

describe('league pieces', () => {
  it('enters a tournament with the chosen deck and place variable', async () => {
    const calls: string[][] = []
    const { c } = ctx({
      runTournament: async (t, d, v) => void calls.push([t, d, v]),
    })
    await runSteps([effect('tournament.run', { tournament: 'locals', deck: 'd1', placeVar: 'place' })], c)
    expect(calls).toEqual([['locals', 'd1', 'place']])
  })

  it('branches on points, rating and entry', async () => {
    const steps: Step[] = [
      ifStep(
        { piece: 'points.has', args: { op: '>=', value: 60, track: 'circuit' } },
        [effect('message.show', { text: 'enough points' })],
        [effect('message.show', { text: 'not enough' })],
      ),
      ifStep({ piece: 'rating.has', args: { op: '>', value: 1100 } }, [
        effect('message.show', { text: 'strong' }),
      ]),
      ifStep({ piece: 'tournament.can', args: { tournament: 'pro' } }, [
        effect('message.show', { text: 'invited' }),
      ]),
    ]
    const low = ctx({ points: () => 10, rating: () => 1000, canEnter: () => false })
    await runSteps(steps, low.c)
    expect(low.log).toEqual(['say not enough'])
    const high = ctx({
      points: (t) => (t === 'circuit' ? 60 : 0),
      rating: () => 1200,
      canEnter: (t) => t === 'pro',
    })
    await runSteps(steps, high.c)
    expect(high.log).toEqual(['say enough points', 'say strong', 'say invited'])
  })

  it('does nothing without a league world', async () => {
    const { c, log } = ctx({})
    c.world = undefined
    await runSteps([effect('tournament.run', { tournament: 'x', deck: 'y', placeVar: '' })], c)
    expect(log).toEqual([])
  })
})
