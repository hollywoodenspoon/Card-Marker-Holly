// Desktop app builds (works the same on Linux, Windows and macOS):
//   node scripts/desktop.mjs dev            run the app with live reload
//   node scripts/desktop.mjs build          build dist/ and dist-electron/
//   node scripts/desktop.mjs dist [args]    build, then package with electron-builder
import { spawn } from 'node:child_process'
import { build, createServer } from 'vite'

const [mode = 'build', ...rest] = process.argv.slice(2)
process.env.VITE_TARGET = 'desktop'

const buildElectron = () => build({ configFile: 'vite.electron.config.ts', logLevel: 'warn' })
const run = (cmd, args, env = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    })
    child.on('exit', (code) => (code ? reject(new Error(`${cmd} exited with ${code}`)) : resolve()))
  })

if (mode === 'dev') {
  const server = await createServer()
  await server.listen()
  await buildElectron()
  const electron = (await import('electron')).default
  await run(electron, ['.'], { CARDMAKER_DEV_URL: server.resolvedUrls.local[0] }).finally(() =>
    server.close(),
  )
} else {
  await build()
  await buildElectron()
  if (mode === 'dist') await run('npx', ['electron-builder', '--publish', 'never', ...rest])
}
