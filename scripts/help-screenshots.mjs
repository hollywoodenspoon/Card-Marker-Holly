// Screenshots for the in-app Help (public/help/<id>.webp), made from a demo project
// in the real app:  npm run help:shots   (or: node scripts/help-screenshots.mjs [id …])
// Needs Chromium for Playwright (set PLAYWRIGHT_CHROMIUM to its path if it isn't found).
// The ids are HELP_SHOTS in src/help/topics.ts.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { createServer } from 'vite'

const only = new Set(process.argv.slice(2))
const OUT = 'public/help'
const DEMO = path.resolve('scripts/help-demo')
mkdirSync(OUT, { recursive: true })

const server = await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'warn' })
await server.listen()
const url = server.resolvedUrls.local[0]
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM ??
  ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
const browser = await chromium.launch({ executablePath })

/** Save a PNG screenshot as WebP (converted by the browser, so no image tools are needed). */
async function save(page, id, png) {
  if (only.size && !only.has(id)) return
  const webp = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${b64}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    c.getContext('2d').drawImage(img, 0, 0)
    return c.toDataURL('image/webp', 0.82).split(',')[1]
  }, png.toString('base64'))
  writeFileSync(`${OUT}/${id}.webp`, Buffer.from(webp, 'base64'))
  console.log(`  ${id}.webp`)
}
const shot = async (page, id, target) =>
  save(page, id, await (target ?? page).screenshot({ animations: 'disabled' }))
const wait = (page, ms = 400) => page.waitForTimeout(ms)
const choose = async (page, trigger, files) => {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), trigger()])
  await fc.setFiles(files)
}
/** Run code in the page with the app's own modules (dev server). */
const app = (page, fn, arg) => page.evaluate(fn, arg)

async function newPage(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, ...opts })
  await ctx.addInitScript(() => {
    localStorage.setItem('cardmaker.theme', 'hearthside')
    localStorage.setItem('cardmaker.themeDark', '1')
    localStorage.setItem('cardmaker.firstRunDone', '1')
  })
  const page = await ctx.newPage()
  page.setDefaultTimeout(15000)
  page.on('pageerror', (e) => console.error('page error:', e.message))
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await wait(page, 800)
  return page
}

// ---------- desktop ----------
const page = await newPage({ width: 1280, height: 800 })

await page.getByRole('button', { name: 'Start a new project' }).click()
const dlg = page.getByRole('dialog')
await dlg.getByLabel('Name').fill('Starfall Duel')
await wait(page)
await shot(page, 'new-project', dlg)
await dlg.getByRole('button', { name: 'Create' }).click()
await wait(page, 1500)

// Demo content: art and a symbol, then six cards from a spreadsheet (mail merge).
const dock = page.getByRole('region', { name: 'Assets' })
const art = [
  'dragon-peak',
  'frost-lake',
  'ember-forge',
  'verdant-grove',
  'storm-coast',
  'golden-hall',
]
await choose(page, () => dock.getByRole('button', { name: 'Upload images' }).click(), [
  ...art.map((a) => `${DEMO}/${a}.jpg`),
  `${DEMO}/fire.svg`,
])
await wait(page, 1200)
await app(page, async () => {
  const { updateLibrary, useEditor } = await import('/src/core/editor/editorStore.ts')
  const fire = Object.values(useEditor.getState().library.assets).find((a) => a.name === 'fire')
  if (fire) updateLibrary((l) => void (l.assets[fire.id].tags = ['fire']))
})

await page.getByRole('button', { name: 'More ways to add a card' }).click()
await page.getByRole('menuitem', { name: /Mail merge/ }).click()
await wait(page, 600)
await page.getByLabel('Paste cells').fill(readFileSync(`${DEMO}/cards.tsv`, 'utf8'))
await page.getByRole('button', { name: 'Use pasted cells' }).click()
await wait(page, 400)
await page.getByLabel('First row').fill('2')
await page.getByRole('button', { name: 'Use header names' }).click()
await page.getByRole('dialog', { name: 'Card data' }).getByLabel('Card name').fill('A')
await wait(page, 400)
await shot(page, 'mail-merge')
await page.getByRole('button', { name: 'Run merge' }).click()
await wait(page, 800)
await page.keyboard.press('Escape')
await wait(page, 800)

// ---------- helpers on the open project ----------
const store = '/src/core/editor/editorStore.ts'
const setView = (patch) => app(page, async ([m, p]) => (await import(m)).setView(p), [store, patch])
/** Id of a part of the current card's front template, by its layer name. */
const partId = (name) =>
  app(
    page,
    async ([m, n]) => {
      const s = (await import(m)).useEditor.getState()
      const card = s.doc.cards[s.view.cardId]
      const walk = (els) => {
        for (const e of els) {
          if (e.name === n) return e.id
          const r = e.children && walk(e.children)
          if (r) return r
        }
      }
      return walk(s.doc.templates[card.frontTemplateId].elements)
    },
    [store, name],
  )
/** Screenshot of part of the page around an element. */
async function clip(id, locator, pad = 0, extra = {}) {
  const b = await locator.boundingBox()
  const vp = page.viewportSize()
  const x = Math.max(0, b.x - pad)
  const y = Math.max(0, b.y - pad)
  const width = Math.min(vp.width - x, b.width + pad * 2 + (extra.w ?? 0))
  const height = Math.min(vp.height - y, (extra.h ?? b.height) + pad * 2)
  await save(
    page,
    id,
    await page.screenshot({ clip: { x, y, width, height }, animations: 'disabled' }),
  )
}
const rail = (name) =>
  page.getByRole('navigation', { name: 'Panels' }).getByRole('button', { name, exact: true })
const left = () => page.locator('aside').first()
const right = () => page.locator('aside').last()
const center = () => page.locator('main').first()

// Tidy the demo: drop the empty starter card, open the dragon, add a deck and a keyword.
await app(
  page,
  async ([m, cmds]) => {
    const { commit, useEditor } = await import(m)
    const { deleteCard, selectCard } = await import(cmds)
    const cards = () => Object.values(useEditor.getState().doc.cards)
    const blank = cards().find((c) => c.name === 'Card 1')
    if (blank) deleteCard(blank.id)
    const byName = (n) => cards().find((c) => c.name === n)
    commit((d) => {
      d.project.decks = [
        {
          id: 'deck-starter',
          name: 'Starter deck',
          counts: Object.fromEntries(cards().map((c, i) => [c.id, i < 2 ? 3 : 2])),
        },
      ]
      d.project.keywords = [
        { id: 'kw-flying', word: 'Flying', style: { bold: true, color: '#0e7490' } },
      ]
    })
    selectCard(byName('Dragon of the Peak').id)
  },
  [store, '/src/core/editor/cardCommands.ts'],
)
await setView({ selection: [] })
await wait(page, 1200)

await shot(page, 'editor')
await clip('cards', left())

// Zoomed in on the canvas, with rulers and the zoom bar.
await page.keyboard.press('Control+=')
await page.keyboard.press('Control+=')
await wait(page, 600)
await clip('canvas-zoom', center())
await page.keyboard.press('Control+0')
await wait(page, 400)

// Right pane with nothing selected: card size, bleed and safe area (Layers folded away).
await app(page, async () =>
  (await import('/src/ui/uiStore.ts')).useUi.getState().setLayersOpen(false),
)
await wait(page)
await clip('card-size', right())
await app(page, async () =>
  (await import('/src/ui/uiStore.ts')).useUi.getState().setLayersOpen(true),
)

// Layers with a part selected.
const title = await partId('Title')
const rules = await partId('Rules')
const artBox = await partId('Art')
await setView({ selection: [title] })
await wait(page)
await clip('layers', right(), 0, { h: 360 })

// The Add menu.
await page.locator('button[aria-haspopup=menu]').filter({ hasText: 'Add' }).click()
await wait(page)
const menu = page.getByRole('menu')
{
  const b = await page
    .locator('button[aria-haspopup=menu]')
    .filter({ hasText: 'Add' })
    .boundingBox()
  const m = await menu.boundingBox()
  const x = Math.min(b.x, m.x) - 12
  const y = b.y - 12
  await save(
    page,
    'add-menu',
    await page.screenshot({
      clip: {
        x,
        y,
        width: Math.max(b.x + b.width, m.x + m.width) - x + 12,
        height: m.y + m.height - y + 12,
      },
    }),
  )
}
await page.keyboard.press('Escape')

// Text: editing on the card, and its properties.
await setView({ selection: [title], editingTextId: title })
await wait(page, 900)
await clip('text-editing', center())
await setView({ editingTextId: null, selection: [rules] })
await wait(page)
await clip('text-props', right())

// The art box and its properties.
await setView({ selection: [artBox] })
await wait(page, 600)
await clip('art-box', center())
await clip('image-props', right())

// One part hidden on this card.
await setView({ selection: [] })
await right().getByRole('button', { name: 'Hide Rules' }).click()
await wait(page, 600)
await shot(page, 'part-toggles')
await right().getByRole('button', { name: 'Show Rules' }).click()

// An icon row with its count bar (undone afterwards).
await page.locator('button[aria-haspopup=menu]').filter({ hasText: 'Add' }).click()
await page.getByRole('menuitem', { name: 'Icon row (stat)' }).click()
await wait(page, 500)
await app(
  page,
  async (m) => {
    const { useEditor } = await import('/src/core/editor/editorStore.ts')
    const { setIconRowIcon } = await import(m)
    const s = useEditor.getState()
    const fire = Object.values(s.library.assets).find((a) => a.name === 'fire')
    setIconRowIcon(s.view.selection[0], fire.id)
  },
  '/src/ui/actions/imageActions.ts',
)
await wait(page, 800)
await clip('icon-row', center())
await page.keyboard.press('Escape')
await page.keyboard.press('Control+z')
await wait(page)

// Left pane tabs.
await clip('assets', page.getByRole('region', { name: 'Assets' }))
await rail('Fonts').click()
await wait(page)
await clip('fonts', left())
await rail('Templates').click()
await wait(page)
await clip('templates', left())
await rail('Decks').click()
await wait(page)
await clip('decks', left())
await rail('Cards').click()

// Template mode.
await page.getByRole('radio', { name: 'Template' }).click()
await wait(page, 800)
await shot(page, 'template-mode')
await page.getByRole('radio', { name: 'Card' }).click()
await wait(page)

// Dialogs from the menu.
const menuItem = async (name) => {
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name }).click()
  await wait(page, 700)
}
await page.getByRole('button', { name: 'Menu' }).click()
await wait(page)
await page.getByRole('menuitem', { name: 'Settings' }).click()
await wait(page)
{
  // The ☰ menu with its Settings submenu open, as one picture.
  const menus = await page.getByRole('menu').all()
  const box = await Promise.all(menus.map((m) => m.boundingBox()))
  const x = Math.min(...box.map((r) => r.x)) - 8
  const y = Math.min(...box.map((r) => r.y)) - 8
  const w = Math.max(...box.map((r) => r.x + r.width)) - x + 8
  const h = Math.max(...box.map((r) => r.y + r.height)) - y + 8
  await save(page, 'settings-menu', await page.screenshot({ clip: { x, y, width: w, height: h } }))
}
// Pointer moves between the two menus close the submenu, so choose it with the keyboard.
await page.getByRole('menuitem', { name: /Theme/ }).focus()
await page.keyboard.press('Enter')
await wait(page, 700)
await shot(page, 'theme-picker', page.getByRole('dialog'))
await page.keyboard.press('Escape')
await wait(page)

await rail('Keywords').click()
await wait(page, 700)
await shot(page, 'keywords', page.getByRole('dialog'))
await page.keyboard.press('Escape')
await menuItem(/Find and replace/)
await page.getByRole('dialog').getByRole('textbox').first().fill('card')
await wait(page, 500)
await shot(page, 'find-replace', page.getByRole('dialog'))
await page.keyboard.press('Escape')
await menuItem(/Tabletop Simulator/)
await shot(page, 'tts', page.getByRole('dialog'))
await page.keyboard.press('Escape')
await rail('Export').click()
await wait(page, 900)
await shot(page, 'card-images', page.getByRole('dialog'))
await page.keyboard.press('Escape')
await wait(page)

// Full-screen views.
await rail('Data').click()
await wait(page, 900)
await shot(page, 'data-table')
await page.keyboard.press('Escape')
await rail('Gallery').click()
await wait(page, 1500)
await shot(page, 'gallery')
await page.getByRole('tab', { name: 'Proofread' }).click()
await wait(page, 900)
await shot(page, 'proofread')
await page.keyboard.press('Escape')
// Playtest: the game pack dialog, then the Playtest app (new tab) mid-game.
await rail('Playtest').click()
await wait(page, 700)
await shot(page, 'game-pack', page.getByRole('dialog'))
const [pt] = await Promise.all([
  page.context().waitForEvent('page'),
  page.getByRole('button', { name: 'Playtest now' }).click(),
])
await pt.waitForURL(/playtest\/#pack=/)
await pt.waitForLoadState('networkidle')
await wait(pt, 1500)
await pt.getByTestId('playtest-start-button').click()
await wait(pt, 1500)
await pt.getByRole('button', { name: 'Random setup' }).click()
await app(pt, async () => {
  const { usePlaytest } = await import('/src/playtest-app/table/usePlaytest.ts')
  const s = usePlaytest.getState()
  const field = (seat) => s.state.zones[`field@${seat}`].slots.map((x) => x[0])
  const [mine, theirs] = [field(0), field(1)]
  for (const id of [mine[0], mine[1], mine[4], theirs[1], theirs[2]])
    s.act({ t: 'flip', piece: id })
  s.act({ t: 'state', piece: mine[1], state: 'attacking' })
  s.act({ t: 'state', piece: theirs[1], state: 'defending' })
  const cube = Object.values(usePlaytest.getState().state.tokens).find((t) => t.owner === 0)
  s.act({ t: 'token', token: cube.id, to: { piece: mine[1] } })
  s.act({ t: 'counter', key: 'points@1', delta: 1 })
  s.act({ t: 'phase', delta: 1 })
  s.act({ t: 'coin' })
  s.select({ kind: 'piece', id: mine[1] })
})
await wait(pt, 1500)
await shot(pt, 'playtest')
await pt.close()
await wait(page)
await rail('Print').click()
await wait(page, 2500)
await shot(page, 'print')
await clip('print-settings', page.getByRole('dialog', { name: 'Print' }).locator('aside').first())
await page.keyboard.press('Escape')
await wait(page)

// Vector Maker: a couple of shapes, tracing and saving.
await rail('Vector').click()
await wait(page, 1500)
const vm = page.getByRole('dialog', { name: 'Vector Maker' })
const cv = await vm.getByTestId('vector-canvas').boundingBox()
await app(page, async () => {
  const { useVector } = await import('/src/vector/store.ts')
  const { shapePath } = await import('/src/vector/shapes.ts').catch(() => ({}))
  return !!useVector && !!shapePath
})
await page.keyboard.press('u')
await page.mouse.move(cv.x + cv.width * 0.35, cv.y + cv.height * 0.35)
await page.mouse.down()
await page.mouse.move(cv.x + cv.width * 0.6, cv.y + cv.height * 0.62, { steps: 8 })
await page.mouse.up()
await wait(page, 500)
await shot(page, 'vector-maker')
await page.keyboard.press('Escape')
await page.keyboard.press('v')
await wait(page, 300)
await vm.getByRole('button', { name: 'Trace image' }).first().click()
await page
  .getByRole('dialog', { name: 'Trace image' })
  .waitFor()
  .catch(async (e) => {
    await page.screenshot({ path: process.env.HELP_SHOTS_DEBUG ?? '/tmp/help-debug.png' })
    throw e
  })
await wait(page, 4000)
await shot(page, 'trace', page.getByRole('dialog', { name: 'Trace image' }))
await page.keyboard.press('Escape')
await wait(page)
await vm.getByRole('button', { name: 'Save' }).click()
await wait(page, 700)
await shot(page, 'vector-save', page.getByRole('dialog', { name: 'Save' }))
await page.keyboard.press('Escape')
await wait(page)
await vm.getByRole('button', { name: 'Back to editor' }).click()
await wait(page)
const clearToasts = () =>
  app(page, async () =>
    (await import('/src/ui/components/feedback.ts')).useFeedback.setState({ toasts: [] }),
  )
await clearToasts()

// Home with the project listed.
await menuItem(/All projects/)
await wait(page, 800)
await clearToasts()
await shot(page, 'home')

// Phone.
await clearToasts()
await page.getByText('Starfall Duel').first().click()
await page.setViewportSize({ width: 390, height: 844 })
await wait(page, 1500)
await shot(page, 'editor-phone')

await server.close()
await browser.close()
