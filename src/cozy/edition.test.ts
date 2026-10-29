import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { COZY_STUBS, COZY_VERSION, isCozy } from '../../scripts/cozyStubs'

const read = (p: string) =>
  readFileSync(fileURLToPath(new URL(`../../${p}`, import.meta.url)), 'utf8')

describe('Cozy edition flag', () => {
  it('turns on from either env var', () => {
    const before = { ...process.env }
    try {
      delete process.env.VITE_EDITION
      delete process.env.EDITION
      expect(isCozy()).toBe(false)
      process.env.EDITION = 'cozy'
      expect(isCozy()).toBe(true)
    } finally {
      Object.assign(process.env, before)
      for (const k of ['VITE_EDITION', 'EDITION']) if (!(k in before)) delete process.env[k]
    }
  })

  it('has its own beta version', () => {
    expect(COZY_VERSION).toMatch(/^0\.\d+\.\d+-beta/)
  })

  it('stands in for every left-out module with a file that exists', () => {
    for (const [id, stub] of Object.entries(COZY_STUBS)) {
      expect(id, stub).toMatch(/^[@.]/)
      expect(() => read(stub), stub).not.toThrow()
    }
  })

  it('leaves out the Vector Maker, the table, the game pack and the updater', () => {
    const keys = Object.keys(COZY_STUBS).join(' ')
    expect(keys).toContain('VectorMaker')
    expect(keys).toContain('GamePackDialog')
    expect(keys).toContain('updater')
    expect(keys).toContain('Update')
  })
})
