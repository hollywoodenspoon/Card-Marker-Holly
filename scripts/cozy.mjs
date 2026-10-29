// Hearthside Cardworks Cozy Edition: the Windows portable exe.
//   node scripts/cozy.mjs build          build dist/ and dist-electron/, protected and checked
//   node scripts/cozy.mjs dist [args]    build, then package with electron-builder.cozy.yml
// The exe is built on Windows (the Release workflow): bytenode's bytecode must come
// from the same Electron and system that runs it.
import { spawn } from 'node:child_process'
import { copyFileSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { build } from 'vite'
import { checkCozy } from './cozyCheck.mjs'

const [mode = 'build', ...rest] = process.argv.slice(2)
Object.assign(process.env, { VITE_TARGET: 'desktop', VITE_EDITION: 'cozy', EDITION: 'cozy' })

const run = (cmd, args, env = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    })
    child.on('exit', (code) => (code ? reject(new Error(`${cmd} exited with ${code}`)) : resolve()))
  })

// Hides names and strings; no control-flow flattening, so the editor stays fast.
const OBFUSCATE = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 1,
  transformObjectKeys: false,
  splitStrings: false,
  selfDefending: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  sourceMap: false,
  target: 'browser',
}

function obfuscate(file, target = 'browser') {
  const code = readFileSync(file, 'utf8')
  const out = JavaScriptObfuscator.obfuscate(code, { ...OBFUSCATE, target }).getObfuscatedCode()
  // Regular expressions aren't encoded; the editor's one for Android browsers matches the same as \x41.
  writeFileSync(file, out.replaceAll('/Android \\d/', '/\\x41ndroid \\d/'))
}

await build({ logLevel: 'warn' })
await build({ configFile: 'vite.electron.config.ts', logLevel: 'warn' })

// No source maps in what ships.
for (const dir of ['dist', 'dist-electron'])
  for (const f of readdirSync(dir, { recursive: true }))
    if (String(f).endsWith('.map')) rmSync(path.join(dir, String(f)))

console.log('Obfuscating the page…')
const assets = path.join('dist', 'assets')
for (const f of readdirSync(assets)) if (/\.m?js$/.test(f)) obfuscate(path.join(assets, f))
// The sandboxed preload can't load bytecode, so it is only obfuscated.
obfuscate(path.join('dist-electron', 'preload.cjs'), 'node')

// The main process runs from V8 bytecode; main.cjs only loads it.
console.log('Compiling the main process to bytecode…')
obfuscate(path.join('dist-electron', 'main.cjs'), 'node')
const electron = (await import('electron')).default
await run(electron, ['node_modules/bytenode/lib/cli.js', '--compile', 'dist-electron/main.cjs'], {
  ELECTRON_RUN_AS_NODE: '1',
})
copyFileSync('node_modules/bytenode/lib/index.js', 'dist-electron/bytenode.cjs')
obfuscate('dist-electron/bytenode.cjs', 'node')
writeFileSync('dist-electron/main.cjs', "require('./bytenode.cjs')\nrequire('./main.jsc')\n")

console.log('Checking strings…')
const hits = await checkCozy(['dist', 'dist-electron'])
if (hits) throw new Error(`Cozy string check: ${hits} banned word(s) found.`)

if (mode === 'dist') {
  await run('npx', [
    'electron-builder',
    '--config',
    'electron-builder.cozy.yml',
    '--publish',
    'never',
    ...rest,
  ])
  const asar = readdirSync('release-cozy', { recursive: true })
    .map(String)
    .filter((f) => f.endsWith('app.asar'))
    .map((f) => path.join('release-cozy', f))
  const n = await checkCozy(asar)
  if (n) throw new Error(`Cozy string check: ${n} banned word(s) found in the package.`)
}
console.log('Cozy Edition built.')
