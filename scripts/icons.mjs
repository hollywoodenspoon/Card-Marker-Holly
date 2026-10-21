// App icons for every platform from two SVGs:  npm run icons
//   assets-src/app-icon.svg    Hearthside Cardworks (website, desktop, Android)
//   assets-src/table-icon.svg  Hearthside Table (the Playtest app)
// To use your own icon, replace the SVG (512 x 512, keep what matters inside the
// middle 80 %, which round and squircle masks never cut) and run the script again.
// Needs Chromium for Playwright (set PLAYWRIGHT_CHROMIUM if it isn't found).
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const RES = 'android/app/src/main/res'
/** The colour behind the icon where a platform fills the rest (Android adaptive icons, splash). */
const BACKGROUND = '#10131b'

const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM ??
  ['/opt/pw-browsers/chromium', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()

/**
 * Draw the SVG into a w x h PNG. `scale`: the icon's size as a share of the
 * shorter side; `fill`: paint the background first; `circle`: clip to a circle.
 */
async function render(svgFile, out, w, h = w, { scale = 1, fill = null, circle = false } = {}) {
  const svg = readFileSync(svgFile, 'utf8')
  const b64 = await page.evaluate(
    async ({ svg, w, h, scale, fill, circle }) => {
      const img = new Image()
      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
      await img.decode()
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const ctx = c.getContext('2d')
      if (circle) {
        ctx.beginPath()
        ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2)
        ctx.clip()
      }
      if (fill) {
        ctx.fillStyle = fill
        ctx.fillRect(0, 0, w, h)
      }
      const s = Math.min(w, h) * scale
      ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s)
      return c.toDataURL('image/png').split(',')[1]
    },
    { svg, w, h, scale, fill, circle },
  )
  writeFileSync(out, Buffer.from(b64, 'base64'))
  console.log(`  ${out}`)
}

async function webIcons(svgFile, dir) {
  copyFileSync(svgFile, `${dir}/icon.svg`)
  await render(svgFile, `${dir}/pwa-192.png`, 192)
  await render(svgFile, `${dir}/pwa-512.png`, 512)
  // Maskable: full-bleed background, the icon inside the safe zone.
  await render(svgFile, `${dir}/pwa-maskable-512.png`, 512, 512, { scale: 0.82, fill: BACKGROUND })
  // iOS rounds the corners itself and doesn't like transparency.
  await render(svgFile, `${dir}/apple-touch-icon.png`, 180, 180, { scale: 0.9, fill: BACKGROUND })
}

await webIcons('assets-src/app-icon.svg', 'public')
await webIcons('assets-src/table-icon.svg', 'public/playtest')

// Android launcher icons (legacy, round, and the adaptive foreground on BACKGROUND).
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
for (const [d, k] of Object.entries(densities)) {
  const dir = `${RES}/mipmap-${d}`
  await render('assets-src/app-icon.svg', `${dir}/ic_launcher.png`, 48 * k)
  await render('assets-src/app-icon.svg', `${dir}/ic_launcher_round.png`, 48 * k, 48 * k, {
    scale: 0.86,
    fill: BACKGROUND,
    circle: true,
  })
  await render('assets-src/app-icon.svg', `${dir}/ic_launcher_foreground.png`, 108 * k, 108 * k, {
    scale: 0.62,
  })
}
writeFileSync(
  `${RES}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BACKGROUND}</color>\n</resources>\n`,
)

// Android splash screens: the icon in the middle of the night background.
const splash = {
  drawable: [480, 320],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
}
for (const [dir, [w, h]] of Object.entries(splash))
  await render('assets-src/app-icon.svg', `${RES}/${dir}/splash.png`, w, h, {
    scale: 0.32,
    fill: BACKGROUND,
  })

await browser.close()
