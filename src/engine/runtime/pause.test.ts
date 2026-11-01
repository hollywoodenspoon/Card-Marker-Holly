import 'fake-indexeddb/auto'
import { describe, expect, it, vi } from 'vitest'
import { useHandoff } from '@/playtest/handoff'
import { useGameCards, type GameCardsState } from '../cards/gameCards'
import { effect, ifStep, newEvent } from '../model/events'
import { newDeck, newGame, newPictureScene, newVariable } from '../model/game'
import { readSave } from '../storage/saves'
import { answerRuntime, loadSnapshot, startRuntime, stopRuntime, useRuntime } from './runtime'

vi.mock('@/app/workspace', () => ({
  useWorkspace: { getState: () => ({ playGame: () => undefined, go: () => undefined }) },
}))

const tick = async (n = 6) => {
  for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0))
}

async function until(ok: () => boolean) {
  for (let i = 0; i < 200 && !ok(); i++) await new Promise((r) => setTimeout(r, 5))
}

describe('pausing a card game', () => {
  it('saves a paused duel, brings it back on load, and sets the result', async () => {
    const g = newGame('Pause')
    const scene = newPictureScene('Home')
    g.scenes.push(scene)
    g.startScene = scene.id
    const won = newVariable('Won', 'flag')
    g.variables.push(won)
    const a = newDeck('A', { a: 2 })
    const b = newDeck('B', { b: 2 })
    g.decks.push(a, b)
    g.economy.startingCards = a.id
    useGameCards.setState({
      gameId: g.id,
      status: 'ready',
      merged: { pack: { info: { cards: [] } } },
    } as unknown as Partial<GameCardsState>)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('cards.play', { deckB: b.id, bot: 'easy', won: won.id }))
    scene.events.push(ev)

    startRuntime(g)
    await tick()
    const first = useHandoff.getState().req
    expect(first).not.toBeNull()
    expect(first!.pauseLabel).toBe('Pause and save')
    first!.done({ winner: null, finished: false, paused: { seed: 42, moves: [[], []] } })
    await until(() => !useRuntime.getState().running)
    expect(useRuntime.getState().running).toBe(false)

    // Loading the save asks the table for the same duel, from its moves.
    useHandoff.setState({ req: null })
    const row = await readSave(g.id, 'auto')
    expect(row?.snapshot.pendingMatch).not.toBeNull()
    loadSnapshot(g, row!.snapshot)
    await until(() => !!useHandoff.getState().req)
    const again = useHandoff.getState().req
    expect(again?.resume).toEqual({ seed: 42, moves: [[], []] })
    expect(again?.decks).toEqual(first!.decks)
    again!.done({ winner: 0, finished: true })
    await until(() => useRuntime.getState().vars[won.id] === true)
    expect(useRuntime.getState().vars[won.id]).toBe(true)
    expect(useRuntime.getState().pendingMatch).toBeNull()
    stopRuntime()
    useHandoff.setState({ req: null })
  })

  it('declines a card game when the player has no deck, and the next steps can tell', async () => {
    const g = newGame('NoDeck')
    const scene = newPictureScene('Home')
    g.scenes.push(scene)
    g.startScene = scene.id
    const b = newDeck('B', { b: 2 })
    g.decks.push(b)
    const won = newVariable('Won', 'flag')
    g.variables.push(won)
    useGameCards.setState({
      gameId: g.id,
      status: 'ready',
      merged: { pack: { info: { cards: [] } } },
    } as unknown as Partial<GameCardsState>)
    const ev = newEvent({ piece: 'scene.start', args: {} })
    ev.steps.push(effect('cards.play', { deckB: b.id, bot: 'easy' }))
    ev.steps.push(
      ifStep(
        { piece: 'cards.lastGame', args: { result: 'declined' } },
        [effect('flag.set', { flag: won.id, state: 'on' })],
        [],
      ),
    )
    scene.events.push(ev)

    startRuntime(g)
    await until(() => !!useRuntime.getState().message)
    expect(useRuntime.getState().message).toBe('You need a deck to play a card game.')
    expect(useHandoff.getState().req).toBeNull()
    answerRuntime()
    await until(() => useRuntime.getState().vars[won.id] === true)
    expect(useRuntime.getState().vars[won.id]).toBe(true)
    stopRuntime()
  })
})
