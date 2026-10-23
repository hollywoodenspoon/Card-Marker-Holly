import type { Lcms } from './vendor/lcms.js'
import { hexToRgb, totalInk, type Cmyk, type Rgb } from './cmyk'

/**
 * sRGB to CMYK through an ICC printer profile, with LittleCMS (WebAssembly).
 * It is loaded only when something needs it (CMYK export or the CMYK preview).
 * Relative colorimetric with black point compensation, the usual intent for
 * print: colours the press can reach stay as they are, the rest move to the
 * nearest colour it can print.
 */

export interface ColorEngine {
  /** The profile's own description, e.g. "ISO Coated v2 (ECI)". */
  description: string
  /** The profile file, embedded in the PDF as its output intent. */
  profile: Uint8Array
  /** Highest total ink the profile uses (its darkest black), in percent. */
  inkLimit: number
  /** One colour, as precise as the engine gives it (16-bit). */
  cmyk(hex: string): Cmyk
  /** RGBA pixels to CMYK, 8 bits per ink (alpha is left out). */
  pixels(rgba: Uint8ClampedArray | Uint8Array): Uint8Array
  /** RGBA pixels as they will print, back in sRGB for the screen (alpha kept). */
  proof(rgba: Uint8ClampedArray): Uint8ClampedArray
  /** One colour as it will print, in sRGB. */
  proofColor(hex: string): Rgb
}

let lcmsLoad: Promise<{ lcms: Lcms; L: typeof import('./vendor/lcms.js') }> | null = null

function loadLcms() {
  lcmsLoad ??= import('./vendor/lcms.js').then(async (L) => ({ L, lcms: await L.instantiate() }))
  return lcmsLoad
}

/** Pixels per call into the engine: keeps its memory small for big images. */
const CHUNK = 1 << 18

/** Strip alpha: RGBA to packed RGB. */
function rgbOf(rgba: Uint8ClampedArray | Uint8Array, from: number, n: number) {
  const out = new Uint8Array(n * 3)
  for (let i = 0, j = from * 4; i < n * 3; i += 3, j += 4) {
    out[i] = rgba[j]
    out[i + 1] = rgba[j + 1]
    out[i + 2] = rgba[j + 2]
  }
  return out
}

/** Open a printer profile. Throws when it isn't a CMYK profile LittleCMS can read. */
export async function loadColorEngine(profile: Uint8Array): Promise<ColorEngine> {
  const { lcms, L } = await loadLcms()
  const cmykP = lcms.cmsOpenProfileFromMem(profile, profile.byteLength)
  if (!cmykP) throw new Error('This file is not an ICC profile that can be read.')
  if (lcms.cmsGetColorSpaceASCII(cmykP).trim() !== 'CMYK') {
    lcms.cmsCloseProfile(cmykP)
    throw new Error('This profile is not a CMYK printer profile.')
  }
  const description =
    lcms.cmsGetProfileInfoASCII(cmykP, L.cmsInfoDescription, 'en', 'US').trim() || 'CMYK profile'
  const srgb = lcms.cmsCreate_sRGBProfile()
  const intent = L.INTENT_RELATIVE_COLORIMETRIC
  const flags = L.cmsFLAGS_BLACKPOINTCOMPENSATION
  const to16 = lcms.cmsCreateTransform(srgb, L.TYPE_RGB_8, cmykP, L.TYPE_CMYK_16, intent, flags)
  const to8 = lcms.cmsCreateTransform(srgb, L.TYPE_RGB_8, cmykP, L.TYPE_CMYK_8, intent, flags)
  const back = lcms.cmsCreateTransform(cmykP, L.TYPE_CMYK_8, srgb, L.TYPE_RGB_8, intent, flags)
  if (!to16 || !to8 || !back) throw new Error('This profile cannot convert colours.')

  const colors = new Map<string, Cmyk>()
  const cmyk = (hex: string): Cmyk => {
    const key = hex.toLowerCase()
    let c = colors.get(key)
    if (!c) {
      // A 16-bit output format gives 16-bit values.
      const out = lcms.cmsDoTransform(
        to16,
        new Uint8Array(hexToRgb(hex)),
        1,
      ) as unknown as Uint16Array
      c = [out[0] / 65535, out[1] / 65535, out[2] / 65535, out[3] / 65535]
      colors.set(key, c)
    }
    return c
  }

  const pixels = (rgba: Uint8ClampedArray | Uint8Array) => {
    const n = rgba.length / 4
    const out = new Uint8Array(n * 4)
    for (let at = 0; at < n; at += CHUNK) {
      const m = Math.min(CHUNK, n - at)
      out.set(lcms.cmsDoTransform(to8, rgbOf(rgba, at, m), m).subarray(0, m * 4), at * 4)
    }
    return out
  }

  const proof = (rgba: Uint8ClampedArray) => {
    const n = rgba.length / 4
    const out = new Uint8ClampedArray(rgba.length)
    for (let at = 0; at < n; at += CHUNK) {
      const m = Math.min(CHUNK, n - at)
      const k = lcms.cmsDoTransform(to8, rgbOf(rgba, at, m), m).subarray(0, m * 4)
      const rgb = lcms.cmsDoTransform(back, k, m)
      for (let i = 0; i < m; i++) {
        const o = (at + i) * 4
        out[o] = rgb[i * 3]
        out[o + 1] = rgb[i * 3 + 1]
        out[o + 2] = rgb[i * 3 + 2]
        out[o + 3] = rgba[o + 3]
      }
    }
    return out
  }

  const proofColor = (hex: string): Rgb => {
    const p = proof(new Uint8ClampedArray([...hexToRgb(hex), 255]))
    return [p[0], p[1], p[2]]
  }

  return {
    description,
    profile,
    inkLimit: Math.round(totalInk(cmyk('#000000'))),
    cmyk,
    pixels,
    proof,
    proofColor,
  }
}
