import { describe, expect, it } from 'vitest'
import { effect, ifStep, newEvent } from '../model/events'
import { newArea, newGame, newPictureScene, newVariable } from '../model/game'
import {
  answerRuntime,
  backScene,
  clickThing,
  startRuntime,
  stopRuntime,
  useRuntime,
} from './runtime'

const tick = () => new Promise((r) => setTimeout(r, 0))

function demo() {
  const g = newGame('Town')
  const town = newPictureScene('Town')
  const shop = newPictureScene('Shop')
  const key = newVariable('Has key', 'flag')
  g.variables.push(key)
  const door = newArea('Door', [])
  const ev = newEvent({ piece: 'area.click', args: {} })
  ev.steps.push(
    ifStep(
      { piece: 'flag.is', args: { flag: key.id, state: 'on' } },
      [effect('scene.go', { scene: shop.id })],
      [effect('message.show', { text: "It's locked." })],
    ),
  )
  door.events.push(ev)
  town.areas.push(door)
  const hello = newEvent({ piece: 'scene.start', args: {} })
  hello.steps.push(effect('flag.set', { flag: key.id, state: 'on' }))
  shop.events.push(hello)
  g.scenes.push(town, shop)
  g.startScene = town.id
  return { g, town, shop, door, key }
}

describe('runtime', () => {
  it('runs clicks, branches, messages, scene starts and Back', async () => {
    const { g, town, shop, door, key } = demo()
    startRuntime(g)
    await tick()
    expect(useRuntime.getState().sceneId).toBe(town.id)
    clickThing(door.events)
    await tick()
    expect(useRuntime.getState().message).toBe("It's locked.")
    // Clicks wait while a message is open.
    clickThing(door.events)
    answerRuntime()
    await tick()
    expect(useRuntime.getState().message).toBeNull()

    useRuntime.setState({ vars: { [key.id]: true } })
    clickThing(door.events)
    await tick()
    await tick()
    expect(useRuntime.getState().sceneId).toBe(shop.id)
    expect(useRuntime.getState().vars[key.id]).toBe(true)
    backScene()
    await tick()
    expect(useRuntime.getState().sceneId).toBe(town.id)
    stopRuntime()
    expect(useRuntime.getState().running).toBe(false)
  })

  it('plays from a chosen scene, starting variables at their first values', async () => {
    const { g, shop, key } = demo()
    startRuntime(g, shop.id)
    await tick()
    await tick()
    expect(useRuntime.getState().sceneId).toBe(shop.id)
    expect(useRuntime.getState().vars[key.id]).toBe(true)
    stopRuntime()
  })
})
