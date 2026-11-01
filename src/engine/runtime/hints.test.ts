import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { effect, newEvent } from '../model/events'
import { newGame, newPictureScene, newVariable } from '../model/game'
import { closeScreen, startRuntime, stopRuntime, useRuntime } from './runtime'

const tick = async (n = 6) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}

function game(tutorial: boolean, times = 2) {
  const g = newGame('Hints')
  const scene = newPictureScene('Home')
  g.scenes.push(scene)
  g.startScene = scene.id
  g.settings.tutorial = tutorial
  const seen = newVariable('Seen', 'number')
  g.variables.push(seen)
  const ev = newEvent({ piece: 'scene.start', args: {} })
  for (let i = 0; i < times; i++)
    ev.steps.push(effect('hint.show', { text: 'Tap the shop.', once: 'once', name: 'shop' }))
  ev.steps.push(effect('money.change', {}))
  scene.events.push(ev)
  return g
}

describe('tutorial hints', () => {
  it('shows a hint once, then remembers it', async () => {
    startRuntime(game(true))
    await tick()
    expect(useRuntime.getState().screen).toEqual({ kind: 'hint', text: 'Tap the shop.' })
    closeScreen()
    await tick()
    expect(useRuntime.getState().screen).toBeNull()
    expect(useRuntime.getState().world?.seenHints).toEqual(['shop'])
    stopRuntime()
  })

  it('shows nothing when the tutorial is off', async () => {
    startRuntime(game(false))
    await tick()
    expect(useRuntime.getState().screen).toBeNull()
    stopRuntime()
  })
})
