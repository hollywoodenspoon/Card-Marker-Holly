import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve(__dirname, '..')

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) return sources(p)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : []
  })
}

describe('effects', () => {
  // `useEffect(() => call())` returns whatever the call returns. React treats a
  // returned value as the cleanup and calls it, so a Promise (scrollIntoView in
  // newer Chromium) crashes production builds. Effect bodies need braces.
  it('never return a value from an arrow without braces', () => {
    const bad = sources(SRC).flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .flatMap((line, i) =>
          /use(Layout|Insertion)?Effect\(\s*(async\s*)?\(\)\s*=>\s*[^{\s]/.test(line)
            ? [`${path.relative(SRC, file)}:${i + 1}`]
            : [],
        ),
    )
    expect(bad).toEqual([])
  })
})
