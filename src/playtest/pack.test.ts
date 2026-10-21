import { strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildPack, readPack, type PackInput } from './pack'
import { adventureScuffle } from './setup'

const jpg = (n: number) => new Uint8Array([0xff, 0xd8, n, n, 0xff, 0xd9])
const input = (): PackInput => ({
  name: 'Adventure Scuffle',
  projectId: 'proj1',
  exportedAt: 1700000000000,
  cardSize: { w: 63, h: 88 },
  cards: [
    {
      id: 'c1',
      name: 'Crimson Duelist',
      w: 63,
      h: 88,
      fields: { FS_AS: 2, A_AS: 4, Ability_AS: 'If this card…' },
      front: jpg(1),
      back: jpg(9),
    },
    {
      id: 'c2',
      name: 'Spirited Knight',
      w: 63,
      h: 88,
      fields: { FS_AS: 1 },
      front: jpg(2),
      back: jpg(9),
    },
    { id: 'c3', name: 'Token', w: 63, h: 88, fields: {}, front: jpg(3), back: null },
  ],
  decks: [{ name: "Adventurer's Guild", counts: { c1: 1, c2: 1, gone: 2, c3: 0 } }],
  setups: [adventureScuffle({ w: 63, h: 88 })],
})

describe('game packs', () => {
  it('round-trips cards, fields, decks and setups', async () => {
    const pack = readPack(await buildPack(input()))
    expect(pack.info).toMatchObject({
      format: 'card-maker-game-pack',
      version: 1,
      name: 'Adventure Scuffle',
      projectId: 'proj1',
    })
    expect(pack.info.cards.map((c) => c.name)).toEqual([
      'Crimson Duelist',
      'Spirited Knight',
      'Token',
    ])
    expect(pack.info.cards[0].fields).toEqual({ FS_AS: 2, A_AS: 4, Ability_AS: 'If this card…' })
    expect(pack.info.cards[2].back).toBeNull()
    // Decks only list cards that are in the pack.
    expect(pack.info.decks).toEqual([{ name: "Adventurer's Guild", counts: { c1: 1, c2: 1 } }])
    expect(pack.info.setups?.[0].id).toBe('preset:adventure-scuffle')
    expect(pack.images[pack.info.cards[0].front]).toEqual(jpg(1))
  })

  it('stores a shared back once', async () => {
    const files = unzipSync(await buildPack(input()))
    expect(Object.keys(files).filter((f) => f.startsWith('images/'))).toHaveLength(4)
    const pack = readPack(zipSync(files))
    expect(pack.info.cards[0].back).toBe(pack.info.cards[1].back)
  })

  it('rejects files that are not packs, newer packs and damaged packs', async () => {
    expect(() => readPack(strToU8('hello'))).toThrow(/not a zip/)
    expect(() => readPack(zipSync({ 'x.txt': strToU8('x') }))).toThrow(/pack.json is missing/)
    expect(() => readPack(zipSync({ 'pack.json': strToU8('{"format":"other"}') }))).toThrow(
      /not a Hearthside Cardworks game pack/,
    )
    const files = unzipSync(await buildPack(input()))
    const info = JSON.parse(new TextDecoder().decode(files['pack.json']))
    expect(() =>
      readPack(
        zipSync({ ...files, 'pack.json': strToU8(JSON.stringify({ ...info, version: 99 })) }),
      ),
    ).toThrow(/newer version/)
    const broken = { ...files }
    delete broken[info.cards[0].front]
    expect(() => readPack(zipSync(broken))).toThrow(/picture of "Crimson Duelist" is missing/)
  })
})
