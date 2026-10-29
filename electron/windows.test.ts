import { describe, expect, it } from 'vitest'
import { routeOpen } from './windows'

describe('routeOpen', () => {
  const own = ['app://cardmaker', 'http://localhost:5173']
  it('opens Hearthside Table (with or without a pack) in its own window', () => {
    expect(routeOpen('app://cardmaker/playtest/', own)).toBe('table')
    expect(routeOpen('app://cardmaker/playtest/index.html#pack=tfq', own)).toBe('table')
    expect(routeOpen('http://localhost:5173/playtest/', own)).toBe('table')
  })
  it('opens Hearthside Engine in its own window', () => {
    expect(routeOpen('app://cardmaker/engine/', own)).toBe('engine')
    expect(routeOpen('app://cardmaker/engine/index.html', own)).toBe('engine')
    expect(routeOpen('http://localhost:5173/engine/', own)).toBe('engine')
    expect(routeOpen('app://other/engine/', own)).toBe('deny')
  })
  it('sends web links to the browser and refuses the rest', () => {
    expect(routeOpen('https://github.com/x', own)).toBe('external')
    expect(routeOpen('app://cardmaker/index.html', own)).toBe('deny')
    expect(routeOpen('app://other/playtest/', own)).toBe('deny')
    expect(routeOpen('file:///etc/passwd', own)).toBe('deny')
    expect(routeOpen('not a url', own)).toBe('deny')
  })
})
