// Cozy Edition string check: fails the build when a word from the main app's
// other products or platforms is left in the files Cozy Edition ships.
//   node scripts/cozyCheck.mjs <dir or .asar> ...
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** Words that must not appear (case-insensitive for "github"). */
export const BANNED = [
  /Adventure/,
  /Scuffle/,
  /Card Maker/,
  /github/i,
  /pacman/,
  /Android/,
  /Linux/,
  /Hearthside Table/,
  /Hearthside Engine/,
]

// Licence texts are kept word for word, so they are not checked.
const EXEMPT = /(^|[\\/])(THIRD_PARTY_NOTICES|LICENSE)[^\\/]*$/
const TEXT = /\.(c?js|mjs|html|css|json|md|txt|svg|webmanifest|ya?ml)$/i

/** Each banned word found in `text`, with a little context around it. */
export function findBanned(text) {
  const hits = []
  for (const re of BANNED) {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
    for (const m of text.matchAll(g)) {
      const at = m.index ?? 0
      hits.push({ word: m[0], context: text.slice(Math.max(0, at - 40), at + m[0].length + 40) })
    }
  }
  return hits
}

/** Every text file under `root` (a folder or an .asar) as [name, contents]. */
async function* files(root) {
  if (root.endsWith('.asar')) {
    const asar = await import('@electron/asar')
    for (const f of asar.listPackage(root, { isPack: false })) {
      const name = f.replace(/^[\\/]/, '')
      if (!TEXT.test(name)) continue
      try {
        yield [`${root}:${name}`, asar.extractFile(root, name).toString('utf8')]
      } catch {
        // A folder entry.
      }
    }
    return
  }
  if (statSync(root).isFile()) {
    yield [root, readFileSync(root, 'utf8')]
    return
  }
  for (const e of readdirSync(root, { withFileTypes: true, recursive: true })) {
    const p = path.join(e.parentPath ?? e.path, e.name)
    if (e.isFile() && TEXT.test(p)) yield [p, readFileSync(p, 'utf8')]
  }
}

/** Checks every root; returns the number of hits and prints each one. */
export async function checkCozy(roots) {
  let count = 0
  for (const root of roots)
    for await (const [name, text] of files(root)) {
      if (EXEMPT.test(name)) continue
      for (const h of findBanned(text)) {
        count++
        console.error(`${name}: "${h.word}" in …${h.context.replace(/\s+/g, ' ')}…`)
      }
    }
  return count
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const n = await checkCozy(process.argv.slice(2))
  if (n) {
    console.error(`Cozy string check: ${n} banned word(s) found.`)
    process.exit(1)
  }
  console.log('Cozy string check: clean.')
}
