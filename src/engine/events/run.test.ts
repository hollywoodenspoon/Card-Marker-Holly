import { describe, expect, it } from 'vitest'
import { choiceStep, effect, ifStep, randomStep, type Recipe, type Step } from '../model/events'
import type { RunContext } from './pieces'
import { recipeRunner, runSteps } from './run'
import { next } from '@/playtest/rng'

function ctx(over: Partial<RunContext> & { picks?: number[]; seed?: number } = {}) {
  const vars: Record<string, boolean | number> = {}
  const log: string[] = []
  let seed = over.seed ?? 7
  const picks = [...(over.picks ?? [])]
  const c: RunContext = {
    getVar: (id) => vars[id],
    setVar: (id, v) => void (vars[id] = v),
    random: () => {
      const [v, s] = next(seed)
      seed = s
      return v
    },
    goToScene: (id) => void log.push(`go ${id}`),
    setObjectVisible: (id, v) => void log.push(`${v ? 'show' : 'hide'} ${id}`),
    showMessage: async (t) => void log.push(`say ${t}`),
    choose: async () => picks.shift() ?? 0,
    wait: async () => undefined,
    runRecipe: async () => undefined,
    call: async (service) => void log.push(`call ${service}`),
    stopped: () => false,
    ...over,
  }
  return { c, vars, log }
}

describe('Cause and Effect', () => {
  it('runs several effects in order', async () => {
    const { c, log, vars } = ctx()
    await runSteps(
      [
        effect('message.show', { text: 'Hello' }),
        effect('flag.set', { flag: 'met', state: 'on' }),
        effect('number.change', { op: 'add', number: 'gold', value: 5 }),
        effect('number.change', { op: 'sub', number: 'gold', value: 2 }),
        effect('scene.go', { scene: 'shop' }),
      ],
      c,
    )
    expect(log).toEqual(['say Hello', 'go shop'])
    expect(vars).toEqual({ met: true, gold: 3 })
  })

  it('branches on if/otherwise, nested', async () => {
    const steps: Step[] = [
      ifStep(
        { piece: 'number.compare', args: { number: 'gold', op: '>=', value: 50 } },
        [
          ifStep(
            { piece: 'flag.is', args: { flag: 'vip', state: 'on' } },
            [effect('scene.go', { scene: 'vip' })],
            [effect('scene.go', { scene: 'shop' })],
          ),
        ],
        [effect('message.show', { text: 'Come back with more gold.' })],
      ),
    ]
    const poor = ctx()
    await runSteps(steps, poor.c)
    expect(poor.log).toEqual(['say Come back with more gold.'])
    const rich = ctx()
    rich.vars.gold = 60
    await runSteps(steps, rich.c)
    expect(rich.log).toEqual(['go shop'])
    rich.vars.vip = true
    rich.log.length = 0
    await runSteps(steps, rich.c)
    expect(rich.log).toEqual(['go vip'])
  })

  it('follows the picked choice', async () => {
    const step = choiceStep('Buy a pack?', ['Yes', 'No'])
    step.options[0].steps.push(effect('message.show', { text: 'Thanks!' }))
    step.options[1].steps.push(effect('message.show', { text: 'Maybe later.' }))
    const a = ctx({ picks: [1] })
    await runSteps([step], a.c)
    expect(a.log).toEqual(['say Maybe later.'])
  })

  it('picks random branches by weight, the same way from the same seed', async () => {
    const step = randomStep([1, 3])
    step.branches[0].steps.push(effect('scene.go', { scene: 'a' }))
    step.branches[1].steps.push(effect('scene.go', { scene: 'b' }))
    const runs = async (seed: number) => {
      const { c, log } = ctx({ seed })
      for (let i = 0; i < 400; i++) await runSteps([step], c)
      return log
    }
    const one = await runs(3)
    expect(await runs(3)).toEqual(one)
    const b = one.filter((x) => x === 'go b').length
    expect(b / one.length).toBeGreaterThan(0.65)
    expect(b / one.length).toBeLessThan(0.85)
  })

  it('runs recipes, also from recipes, and stops endless loops', async () => {
    const recipes: Recipe[] = [
      {
        id: 'r1',
        name: 'Greet',
        steps: [effect('message.show', { text: 'Hi' }), effect('recipe.run', { recipe: 'r2' })],
      },
      { id: 'r2', name: 'Loop', steps: [effect('recipe.run', { recipe: 'r2' })] },
    ]
    const { c, log } = ctx()
    let run: (id: string) => Promise<void> = async () => undefined
    const full = { ...c, runRecipe: (id: string) => run(id) }
    run = recipeRunner(recipes, () => full, 5)
    await runSteps([effect('recipe.run', { recipe: 'r1' })], full)
    expect(log).toEqual(['say Hi'])
  })

  it('hands module effects to the runtime, and skips unknown pieces', async () => {
    const { c, log } = ctx()
    await runSteps([effect('nope.unknown'), effect('cards.play', { deckA: 'x', deckB: 'y' })], c)
    expect(log).toEqual(['call cards.play'])
  })

  it('stops when told to', async () => {
    let stop = false
    const { c, log } = ctx({
      stopped: () => stop,
      showMessage: async (t) => {
        log.push(t)
        stop = true
      },
    })
    await runSteps(
      [effect('message.show', { text: 'one' }), effect('message.show', { text: 'two' })],
      c,
    )
    expect(log).toEqual(['one'])
  })
})
