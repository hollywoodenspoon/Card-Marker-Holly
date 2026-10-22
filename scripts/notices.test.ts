import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs build script, without types
import { notices } from './notices.mjs'

const lf = (s: string) => s.replace(/\r\n/g, '\n')

describe('third-party notices', () => {
  it('list every shipped package (run `npm run notices` after changing dependencies)', () => {
    const file = readFileSync(new URL('../public/THIRD_PARTY_NOTICES.txt', import.meta.url), 'utf8')
    expect(lf(file)).toBe(lf(notices()))
  })
})
