// Replay saved Adventure Scuffle games and report illegal moves or broken rules.
//
//   npm run as:check -- games.jsonl [--pack my.cmpack]
//
// games.jsonl comes from `npm run as:sim -- --games-out` or the Balance lab's
// "Save games". Without --pack the cards are The First Quest's.
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const i = args.indexOf('--pack')
const packPath = i >= 0 ? args[i + 1] : undefined
const file = args.find((a, k) => !a.startsWith('--') && args[k - 1] !== '--pack')
if (!file) {
  process.stderr.write('Usage: npm run as:check -- games.jsonl [--pack my.cmpack]\n')
  process.exit(2)
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
})
try {
  const { checkRecords } = await server.ssrLoadModule('/src/adventure/sim/checkFile.ts')
  const pack = packPath ? new Uint8Array(readFileSync(packPath)) : undefined
  const r = checkRecords(readFileSync(file, 'utf8'), pack)
  for (const p of r.problems) process.stdout.write(`${p}\n`)
  process.stdout.write(`${r.games} games checked, ${r.bad} with problems.\n`)
  process.exitCode = r.bad ? 1 : 0
} finally {
  await server.close()
}
