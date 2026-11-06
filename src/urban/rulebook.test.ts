import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => readFileSync(new URL(`../../game/${p}`, import.meta.url), 'utf8')

describe('combined rulebook', () => {
  it('holds both mode rulebooks word for word', () => {
    const all = read('rulebook.md')
    expect(all).toContain(read('battlelines/rulebook.md'))
    expect(all).toContain(read('urban-warfare/rulebook.md'))
  })
})
