// Adventure Scuffle balance runs: bot-against-bot games with no screen, and a
// Markdown report. Runs the TypeScript rules through Vite, like the app does.
//
//   npm run as:sim -- [--games 500] [--levels normal,hard] [--pack my.cmpack]
//                     [--seed 1] [--playouts 48] [--out report.md]
//
// Without --pack it plays The First Quest's three premade decks.
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback
}
const games = Number(opt('games', 200))
const levels = String(opt('levels', 'normal')).split(',')
const seed = Number(opt('seed', 1))
const playouts = opt('playouts') ? Number(opt('playouts')) : undefined
const packPath = opt('pack')
const out = opt('out')

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
try {
  const { run } = await server.ssrLoadModule('/src/adventure/sim/run.ts')
  const pack = packPath ? new Uint8Array(readFileSync(packPath)) : undefined
  const started = Date.now()
  const md = run({ games, levels, seed, playouts, pack }, (n) => {
    if (n % 10 === 0 || n === games) process.stderr.write(`\r${n}/${games} games`)
  })
  process.stderr.write(
    `\rDone: ${games} games in ${((Date.now() - started) / 1000).toFixed(1)} s\n`,
  )
  if (out) {
    writeFileSync(out, md)
    process.stderr.write(`Report written to ${out}\n`)
  } else process.stdout.write(md)
} finally {
  await server.close()
}
