import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadViewMode, nextSort, saveViewMode, sortRows } from './viewMode'

describe('view modes', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('remembers a mode per panel and ignores junk', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    })
    expect(loadViewMode('cards', 'large')).toBe('large')
    saveViewMode('cards', 'grid')
    expect(loadViewMode('cards', 'large')).toBe('grid')
    expect(loadViewMode('assets', 'grid')).toBe('grid')
    store.set('cardmaker.view.assets', 'huge')
    expect(loadViewMode('assets', 'small')).toBe('small')
  })

  it('sorts for display, by text (natural order) or number, both ways', () => {
    const rows = [
      { name: 'Card 10', n: 3 },
      { name: 'card 2', n: 1 },
      { name: 'Card 1', n: 2 },
    ]
    const v = (r: (typeof rows)[number], k: 'name' | 'n') => r[k]
    expect(sortRows(rows, { key: 'name', dir: 1 }, v).map((r) => r.name)).toEqual([
      'Card 1',
      'card 2',
      'Card 10',
    ])
    expect(sortRows(rows, { key: 'n', dir: -1 }, v).map((r) => r.n)).toEqual([3, 2, 1])
    expect(rows[0].name).toBe('Card 10')
  })

  it('flips the direction on the same column, starts up on a new one', () => {
    expect(nextSort({ key: 'name', dir: 1 }, 'name')).toEqual({ key: 'name', dir: -1 })
    expect(nextSort({ key: 'name', dir: -1 }, 'size')).toEqual({ key: 'size', dir: 1 })
  })
})
