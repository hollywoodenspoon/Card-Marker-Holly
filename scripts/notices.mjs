// Writes public/THIRD_PARTY_NOTICES.txt: the licence of every package the apps ship
// (the non-dev packages in package-lock.json), plus the icons and fonts.
//   npm run notices
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'))

const authorOf = (dir) => {
  try {
    const a = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')).author
    return (typeof a === 'string' ? a : a?.name) || 'the package authors'
  } catch {
    return 'the package authors'
  }
}

const mit = (who) => `Copyright (c) ${who}

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be included in all copies
or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`

/** The shipped packages: name, version, licence and licence text. */
export function shipped() {
  const out = []
  for (const [where, p] of Object.entries(lock.packages)) {
    if (!where || p.dev || p.devOptional) continue
    const name = where.split('node_modules/').at(-1)
    const dir = path.join(root, where)
    const file = existsSync(dir)
      ? readdirSync(dir).find((f) => /^(licen[cs]e|copying|notice)(\.|$)/i.test(f))
      : undefined
    let text = file ? readFileSync(path.join(dir, file), 'utf8').trim() : ''
    // A few MIT packages ship no licence file: give the MIT text with their author.
    if (!text && p.license === 'MIT') text = mit(authorOf(dir))
    out.push({ name, version: p.version, license: p.license ?? 'see the package', text })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export function notices() {
  const rule = '-'.repeat(72)
  const parts = [
    'Hearthside Cardworks: third-party notices',
    '',
    'Hearthside Cardworks is proprietary software, copyright (c) 2026 Hanielle Marie',
    'N. Armas. It includes the third-party parts below, each under its own licence.',
    '',
    rule,
    'Icons: game-icons.net, by Lorc, Delapouite and contributors, used under the',
    'Creative Commons Attribution 3.0 licence (https://creativecommons.org/licenses/by/3.0/).',
    'The app icons put them on a coloured background.',
    '',
    'Fonts: Inter, Alegreya and Alegreya SC, under the SIL Open Font License 1.1',
    '(texts in the @fontsource packages below).',
    '',
    'The desktop app is built on Electron and Chromium; their licences ship next to',
    'the program as LICENSE.electron.txt and LICENSES.chromium.html.',
    '',
    rule,
    // Vendored files (not npm packages), used for CMYK print export.
    readFileSync(path.join(root, 'src/print/color/vendor/LICENSE.txt'), 'utf8').trim(),
    '',
    rule,
    readFileSync(
      path.join(root, 'src/print/color/profiles/LICENSE-ISOcoated_v2_eci.txt'),
      'utf8',
    ).trim(),
  ]
  for (const p of shipped())
    parts.push('', rule, `${p.name} ${p.version} (${p.license})`, ...(p.text ? ['', p.text] : []))
  return parts.join('\n') + '\n'
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFileSync(path.join(root, 'public/THIRD_PARTY_NOTICES.txt'), notices())
  console.log(`public/THIRD_PARTY_NOTICES.txt: ${shipped().length} packages`)
}
