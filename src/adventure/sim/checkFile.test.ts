import { describe, expect, it } from 'vitest'
import { checkRecords } from './checkFile'
import { run } from './run'

describe('checkRecords', () => {
  it('passes saved sim games and catches a tampered move', () => {
    const lines: string[] = []
    run({ games: 2, levels: ['easy'], seed: 5, onRecord: (l) => lines.push(l) })
    expect(checkRecords(lines.join('\n'))).toMatchObject({ games: 2, bad: 0 })
    const g = JSON.parse(lines[0]) as { moves: unknown[] }
    g.moves[3] = { t: 'pass' }
    expect(checkRecords(JSON.stringify(g)).bad).toBe(1)
  }, 60_000)
})
