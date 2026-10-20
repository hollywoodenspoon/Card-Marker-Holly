import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { AllowedRoots, isInside } from './paths'

describe('isInside', () => {
  it('accepts the root and paths below it', () => {
    expect(isInside('/a/b', '/a/b', path.posix)).toBe(true)
    expect(isInside('/a/b', '/a/b/c/d.png', path.posix)).toBe(true)
    expect(isInside('/a/b/', '/a/b/./c', path.posix)).toBe(true)
  })
  it('rejects escapes and look-alike siblings', () => {
    expect(isInside('/a/b', '/a/b/../c', path.posix)).toBe(false)
    expect(isInside('/a/b', '/a/bc', path.posix)).toBe(false)
    expect(isInside('/a/b', '/a', path.posix)).toBe(false)
    expect(isInside('/a/b', '/etc/passwd', path.posix)).toBe(false)
  })
  it('handles Windows paths and drives', () => {
    const w = path.win32
    expect(isInside('C:\\Users\\me\\Documents', 'C:/Users/me/Documents/Game/project.json', w)).toBe(
      true,
    )
    expect(isInside('C:\\Users\\me\\Documents', 'D:\\Users\\me\\Documents\\x', w)).toBe(false)
    expect(isInside('C:\\Users\\me\\Documents', 'C:\\Users\\me\\Documents\\..\\x', w)).toBe(false)
  })
})

describe('AllowedRoots', () => {
  it('follows links through the real path before checking', () => {
    // "/docs/link" points outside the allowed folder.
    const real = (p: string) => path.posix.resolve(p).replace(/^\/docs\/link/, '/elsewhere')
    const roots = new AllowedRoots(real, path.posix)
    roots.add('/docs')
    expect(roots.check('/docs/Game/project.json')).toBe('/docs/Game/project.json')
    expect(() => roots.check('/docs/link/secret')).toThrow(/not allowed/)
    expect(() => roots.check('')).toThrow()
    expect(() => roots.check(42)).toThrow()
  })
})
