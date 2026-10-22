import { chromium } from 'playwright-core'
import { createServer } from 'vite'
const SP = process.env.SP
const server = await createServer({ server: { port: 5205 }, logLevel: 'warn' }); await server.listen()
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const { seedPack } = await import(process.cwd() + '/.seed-pack.mjs')
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
const page = await ctx.newPage()
page.on('pageerror', (e) => console.error('page error:', e.message))
await seedPack(page, base, SP)
await page.getByTestId('playtest-decks-button').click(); await page.waitForTimeout(800)
const warn = page.getByText(/card\(s\) have missing or odd values/)
console.log('issues button:', await warn.count() ? await warn.innerText() : 'none')
if (await warn.count()) { await warn.click(); await page.waitForTimeout(300) }
await page.screenshot({ path: `${SP}/reader-deckbuilder.png` })
const items = await page.locator('ul.list-disc li').allInnerTexts()
console.log(items.join('\n'))
await browser.close(); await server.close()
