import { describe, expect, it } from 'vitest'
import { newGame, newPictureScene } from '../model/game'
import { newMapDoc } from '../model/map'
import { exportGameFile, GameFileError, parseGameFile } from './gameFile'

describe('game files', () => {
  it('round-trips a game with fresh ids, its maps repointed, and its packs', async () => {
    const map = newMapDoc('Town')
    const game = newGame('Scuffle')
    game.sources.push({ kind: 'pack', id: 'tfq', name: 'TFQ' })
    game.scenes.push(
      { id: 's', name: 'Town', kind: 'map', mapId: map.id, events: [] },
      newPictureScene('Shop'),
    )
    const file = await exportGameFile({
      game,
      maps: [map],
      assets: [],
      packs: [{ id: 'tfq', bytes: new Uint8Array([1, 2, 3, 250]) }],
    })
    const back = parseGameFile(JSON.stringify(file))
    expect(back.game.id).not.toBe(game.id)
    expect(back.game.name).toBe('Scuffle')
    expect(back.maps[0].id).not.toBe(map.id)
    const s = back.game.scenes[0]
    expect(s.kind === 'map' && s.mapId).toBe(back.maps[0].id)
    expect([...back.packs[0].bytes]).toEqual([1, 2, 3, 250])
    expect(back.game.sources).toEqual(game.sources)
  })

  it('refuses other files', () => {
    expect(() => parseGameFile('nope')).toThrow(GameFileError)
    expect(() => parseGameFile('{"format":"hearthside-map"}')).toThrow(
      /not a Hearthside Engine game/,
    )
    expect(() => parseGameFile('{"format":"hearthside-game","version":1}')).toThrow(
      /missing its game/,
    )
  })
})
