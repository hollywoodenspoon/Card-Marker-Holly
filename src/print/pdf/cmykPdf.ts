import { zlibSync } from 'fflate'
import { jsPDF } from 'jspdf'

/**
 * What jsPDF lacks for CMYK output: raw CMYK images (with transparency) and
 * the output intent that tells the print shop which printing condition the
 * colours were made for.
 */

export interface CmykRaster {
  width: number
  height: number
  /** 4 bytes per pixel, C M Y K, 0 = no ink. */
  cmyk: Uint8Array
  /** 1 byte per pixel, or none when the image is opaque. */
  alpha?: Uint8Array
}

const binary = (b: Uint8Array) => {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return s
}

// jsPDF finds an image processor by format name. The image itself travels in
// this map; addImage only carries a small token that matches no file format.
const pending = new Map<string, CmykRaster>()
let tokens = 0
const FORMAT = 'CMYKRAW'

interface JsPdfImage {
  alias: string
  index: number
  data: string
  filter: string
  colorSpace: string
  bitsPerComponent: number
  width: number
  height: number
  sMask?: string
  sMaskBitsPerComponent?: number
  predictor?: number
}

const api = jsPDF.API as unknown as Record<string, unknown>
api[`process${FORMAT}`] = function (token: Uint8Array, index: number, alias: string): JsPdfImage {
  const key = binary(token)
  const r = pending.get(key)
  pending.delete(key)
  if (!r) throw new Error('CMYK image data is missing.')
  // jsPDF marks every DeviceCMYK image with Decode [1 0 …] (inverted, as in
  // Adobe CMYK JPEGs), so store the inks inverted.
  const inv = new Uint8Array(r.cmyk.length)
  for (let i = 0; i < inv.length; i++) inv[i] = 255 - r.cmyk[i]
  const out: JsPdfImage = {
    alias,
    index,
    data: binary(zlibSync(inv)),
    filter: 'FlateDecode',
    colorSpace: 'DeviceCMYK',
    bitsPerComponent: 8,
    width: r.width,
    height: r.height,
  }
  if (r.alpha) {
    // jsPDF writes the soft mask with a PNG predictor, so each row starts with
    // a filter-type byte (0: none).
    const rows = new Uint8Array((r.width + 1) * r.height)
    for (let y = 0; y < r.height; y++)
      rows.set(r.alpha.subarray(y * r.width, (y + 1) * r.width), y * (r.width + 1) + 1)
    out.sMask = binary(zlibSync(rows))
    out.sMaskBitsPerComponent = 8
    out.predictor = 15
  }
  return out
}

/** Place a CMYK image; the same alias reuses it without embedding it again. */
export function addCmykImage(
  doc: jsPDF,
  img: CmykRaster,
  alias: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const id = ++tokens
  const token = new Uint8Array([1, 0x43, 0x4d, 0x59, 0x4b, id >>> 24, id >>> 16, id >>> 8, id])
  pending.set(binary(token), img)
  try {
    doc.addImage(token, FORMAT, x, y, w, h, alias, 'NONE')
  } finally {
    // An alias jsPDF already had never reaches the processor.
    pending.delete(binary(token))
  }
}

/** Split RGBA into a CMYK raster's alpha (none when every pixel is opaque). */
export function alphaOf(rgba: Uint8ClampedArray | Uint8Array): Uint8Array | undefined {
  const n = rgba.length / 4
  let opaque = true
  for (let i = 3; i < rgba.length; i += 4)
    if (rgba[i] !== 255) {
      opaque = false
      break
    }
  if (opaque) return undefined
  const a = new Uint8Array(n)
  for (let i = 0; i < n; i++) a[i] = rgba[i * 4 + 3]
  return a
}

interface Internal {
  newObject(): number
  write(...s: string[]): void
  putStream(o: {
    data: string
    additionalKeyValues?: { key: string; value: string | number }[]
    filters?: string[]
    alreadyAppliedFilters?: string[]
    objectId?: number
  }): void
  events: { subscribe(event: string, fn: () => void, once?: boolean): void }
}

const pdfString = (s: string) =>
  `(${s.replace(/[\\()]/g, (c) => '\\' + c).replace(/[^\x20-\x7e]/g, '?')})`

/**
 * Embed the printer profile as the document's output intent (as PDF/X does),
 * so the print shop's software knows what the CMYK values mean.
 */
export function addOutputIntent(doc: jsPDF, profile: Uint8Array, condition: string, info: string) {
  const internal = doc.internal as unknown as Internal
  let profileId = 0
  internal.events.subscribe('putAdditionalObjects', () => {
    profileId = internal.newObject()
    internal.putStream({
      data: binary(zlibSync(profile)),
      additionalKeyValues: [{ key: 'N', value: 4 }],
      filters: [],
      alreadyAppliedFilters: ['/FlateDecode'],
      objectId: profileId,
    })
    internal.write('endobj')
  })
  internal.events.subscribe('putCatalog', () => {
    internal.write(
      '/OutputIntents [<< /Type /OutputIntent /S /GTS_PDFX',
      `/OutputConditionIdentifier ${pdfString(condition)}`,
      `/OutputCondition ${pdfString(info)} /Info ${pdfString(info)}`,
      '/RegistryName (http://www.color.org)',
      `/DestOutputProfile ${profileId} 0 R >>]`,
    )
  })
}
