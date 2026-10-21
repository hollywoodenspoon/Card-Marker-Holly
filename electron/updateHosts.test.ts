import { describe, expect, it } from 'vitest'
import { compareVersions, isUpdateHost, newestTag, shortError } from './updateHosts'

describe('update hosts', () => {
  it('allows only GitHub over https', () => {
    expect(isUpdateHost('https://api.github.com/repos/a/b/releases')).toBe(true)
    expect(isUpdateHost('https://github.com/a/b/releases/download/v1/latest.yml')).toBe(true)
    expect(isUpdateHost('https://objects.githubusercontent.com/x')).toBe(true)
    expect(isUpdateHost('https://release-assets.githubusercontent.com/x')).toBe(true)
    expect(isUpdateHost('http://github.com/x')).toBe(false)
    expect(isUpdateHost('https://github.com.evil.example/x')).toBe(false)
    expect(isUpdateHost('https://evilgithubusercontent.com/x')).toBe(false)
    expect(isUpdateHost('https://example.com/?u=github.com')).toBe(false)
    expect(isUpdateHost('not a url')).toBe(false)
  })
})

describe('compareVersions', () => {
  it('orders versions like semver', () => {
    const order = [
      '0.1.0-alpha.1',
      '0.1.0-alpha.2',
      '0.1.0-alpha.10',
      '0.1.0-beta.1',
      '0.1.0-rc.1',
      '0.1.0',
      '0.1.1',
      '0.2.0',
      '1.0.0',
    ]
    for (let i = 1; i < order.length; i++) {
      expect(compareVersions(order[i - 1], order[i])).toBe(-1)
      expect(compareVersions(order[i], order[i - 1])).toBe(1)
    }
    expect(compareVersions('v0.1.0-alpha.2', '0.1.0-alpha.2')).toBe(0)
  })
})

describe('newestTag', () => {
  const feed = ['v0.1.0-alpha.1', 'v0.1.0-alpha.3', 'v0.1.0', 'v0.1.0-alpha.2', 'nightly']
    .map(
      (t) =>
        `<entry><link rel="alternate" type="text/html" href="https://github.com/o/r/releases/tag/${t}"/></entry>`,
    )
    .join('')
  it('picks the highest version', () => {
    expect(newestTag(feed, true)).toEqual({
      version: '0.1.0',
      url: 'https://github.com/o/r/releases/tag/v0.1.0',
    })
    const pre = feed.replace('v0.1.0"', 'v0.0.9"')
    expect(newestTag(pre, true)?.version).toBe('0.1.0-alpha.3')
    expect(newestTag(pre, false)?.version).toBe('0.0.9')
    expect(newestTag('<feed/>', true)).toBeNull()
  })
})

describe('shortError', () => {
  it('keeps the first line and drops long links', () => {
    expect(
      shortError(
        new Error(
          'Cannot find latest-linux.yml in the latest release (https://x/y): 404\nHeaders…',
        ),
      ),
    ).toBe('the newest release has no update file yet')
    expect(shortError(new Error('net::ERR_INTERNET_DISCONNECTED\nmore'))).toBe(
      'net::ERR_INTERNET_DISCONNECTED',
    )
    expect(shortError('x'.repeat(300))).toHaveLength(138)
  })
})

describe('the pacman repository release', () => {
  it('is never taken for a version', () => {
    const atom = `<link href="https://github.com/o/r/releases/tag/pacman-repo"/>
      <link href="https://github.com/o/r/releases/tag/v0.1.0-alpha.3"/>`
    expect(newestTag(atom, true)?.version).toBe('0.1.0-alpha.3')
  })
})
