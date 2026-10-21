// Android app builds:
//   node scripts/android.mjs sync   build the web app for Android and copy it into android/
//   node scripts/android.mjs apk    sync, then build the release APK (needs the Android SDK)
// The APK ends up in release/Hearthside-Cardworks-<version>.apk.
import { spawn } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { build } from 'vite'
import { versionCode } from './versionCode.mjs'

const [mode = 'sync'] = process.argv.slice(2)
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
process.env.VITE_TARGET = 'android'

const run = (cmd, args, cwd = '.') =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd, shell: process.platform === 'win32' })
    child.on('exit', (code) => (code ? reject(new Error(`${cmd} exited with ${code}`)) : resolve()))
  })

writeFileSync(
  'android/version.properties',
  `versionName=${version}\nversionCode=${versionCode(version)}\n`,
)
await build()
await run('npx', ['cap', 'sync', 'android'])

if (mode === 'apk') {
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
  await run(gradlew, ['assembleRelease', '--no-daemon'], 'android')
  mkdirSync('release', { recursive: true })
  const out = `release/Hearthside-Cardworks-${version}.apk`
  copyFileSync('android/app/build/outputs/apk/release/app-release.apk', out)
  console.log(`Built ${out}`)
}
