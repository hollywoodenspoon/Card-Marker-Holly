import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pageIds, pageSource } from './pages'
import { renderHelp } from './render'
import { searchHelp } from './search'
import { slug } from './slug'
import { HELP_SECTIONS, HELP_SHOTS, HELP_TOPICS } from './topics'

const ids = HELP_TOPICS.map((t) => t.id)
const headingIds = (id: string) =>
  [...(pageSource(id) ?? '').matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => slug(m[1]))

describe('Help pages', () => {
  it('has one page per topic and one topic per page', () => {
    expect(new Set(ids).size).toBe(ids.length)
    expect([...pageIds()].sort()).toEqual([...ids].sort())
    for (const t of HELP_TOPICS) expect(HELP_SECTIONS).toContain(t.section)
  })

  it.each(HELP_TOPICS)('$id starts with its title', (t) => {
    expect(pageSource(t.id)!.split('\n')[0]).toBe(`# ${t.title}`)
  })

  it.each(HELP_TOPICS)('$id links only to pages and headings that exist', (t) => {
    for (const [, page, anchor] of pageSource(t.id)!.matchAll(/\(help:([\w-]+)(?:#([\w-]+))?\)/g)) {
      expect(ids, `${t.id} → ${page}`).toContain(page)
      if (anchor) expect(headingIds(page), `${t.id} → ${page}#${anchor}`).toContain(anchor)
    }
  })

  it.each(HELP_TOPICS)('$id shows only screenshots that exist', (t) => {
    for (const [, shot] of pageSource(t.id)!.matchAll(/!\[[^\]]*\]\(([\w-]+)\.webp\)/g)) {
      expect(HELP_SHOTS as readonly string[], `${t.id} uses ${shot}`).toContain(shot)
      expect(existsSync(`public/help/${shot}.webp`), `public/help/${shot}.webp`).toBe(true)
    }
    // No other kind of picture or raw HTML.
    expect(pageSource(t.id)).not.toMatch(/!\[[^\]]*\]\((?![\w-]+\.webp\))/)
    expect(pageSource(t.id)).not.toMatch(/<\/?[a-z][\w-]*[\s>]/i)
  })

  it('every screenshot file is listed and used', () => {
    const used = new Set(
      HELP_TOPICS.flatMap((t) =>
        [...pageSource(t.id)!.matchAll(/\(([\w-]+)\.webp\)/g)].map((m) => m[1]),
      ),
    )
    const files = existsSync('public/help')
      ? readdirSync('public/help').map((f) => f.replace(/\.webp$/, ''))
      : []
    for (const f of files) expect(HELP_SHOTS as readonly string[], `stray file ${f}`).toContain(f)
    // Cozy Edition leaves out some pages, so their screenshots go unused there.
    if (!__COZY__)
      for (const s of HELP_SHOTS) expect(used, `screenshot ${s} is never shown`).toContain(s)
  })

  it('the shortcuts page mentions the editor shortcuts that exist', () => {
    const page = pageSource('shortcuts')!
    const code = readFileSync('src/ui/actions/useShortcuts.ts', 'utf8')
    // Each Ctrl+letter shortcut in the code appears on the page.
    for (const [, key] of code.matchAll(/mod && k === '([a-z])'/g))
      expect(page.toLowerCase(), `Ctrl+${key}`).toContain(`ctrl+${key}`)
  })
})

describe('Help rendering', () => {
  it('turns keys, links, callouts and pictures into HTML, and never runs HTML', () => {
    const r = renderHelp(
      '# Title\n\n## Cut marks & guides\n\nPress [[Ctrl+Z]]. See [print](help:printing#cut-marks).\n\n> **Tip:** Nice.\n\n![The print view](print.webp)\n\n<script>alert(1)</script>\n',
      '/help/',
    )
    expect(r.title).toBe('Title')
    expect(r.headings).toEqual([{ id: 'cut-marks-guides', text: 'Cut marks & guides' }])
    expect(r.html).toContain('<kbd>Ctrl</kbd><span class="kbd-plus">+</span><kbd>Z</kbd>')
    expect(r.html).toContain('data-help="printing" data-anchor="cut-marks"')
    expect(r.html).toContain('class="callout callout-tip"')
    expect(r.html).toContain('<img src="/help/print.webp" alt="The print view"')
    expect(r.html).not.toContain('<script>')
    expect(r.html).toContain('&lt;script&gt;')
  })

  it('every page renders', () => {
    for (const t of HELP_TOPICS)
      expect(renderHelp(pageSource(t.id)!, '/').html.length).toBeGreaterThan(200)
  })
})

describe('Help search', () => {
  it('finds pages by title, keywords and text; every word must match', () => {
    const titles = (q: string) => searchHelp(q, HELP_TOPICS, pageSource).map((h) => h.topic.id)
    expect(titles('bleed')[0]).toBe('card-size')
    expect(titles('mirrored backs')).toContain('double-sided')
    expect(titles('tabletop')[0]).toBe('tabletop-simulator')
    expect(titles('zzzz nothing')).toEqual([])
    expect(titles('   ')).toEqual([])
  })
})
