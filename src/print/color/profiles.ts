import fogra39Url from './profiles/ISOcoated_v2_eci.icc?url'
import { loadColorEngine, type ColorEngine } from './engine'

/**
 * The printer profile CMYK output is made for. One is built in: ISO Coated
 * v2 (ECI), the FOGRA39 condition most print shops outside the US accept. A
 * print shop's own profile can be loaded instead; it is kept on this device.
 */

export const BUILTIN_PROFILE = {
  /** The PDF output intent's condition identifier (a name print shops know). */
  condition: 'FOGRA39',
  name: 'FOGRA39 (ISO Coated v2, ECI)',
}

/** A print shop's own profile, as stored in the app settings. */
export interface CustomProfile {
  /** File name, e.g. "MyPrinter_Coated.icc". */
  fileName: string
  /** The profile's description, read when it was loaded. */
  description: string
  /** The .icc file, base64. */
  data: string
}

/** App setting key for the custom profile (one per device). */
export const CUSTOM_PROFILE_KEY = 'cmykProfile'

export interface LoadedProfile {
  engine: ColorEngine
  /** For the PDF output intent. */
  condition: string
  /** Shown in Print. */
  name: string
}

const toBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

let builtin: Promise<LoadedProfile> | null = null
const custom = new Map<string, Promise<LoadedProfile>>()

/** The built-in FOGRA39 profile (fetched once, then cached). */
export function builtinProfile(): Promise<LoadedProfile> {
  builtin ??= fetch(fogra39Url)
    .then((r) => {
      if (!r.ok) throw new Error('The built-in printer profile could not be loaded.')
      return r.arrayBuffer()
    })
    .then((b) => loadColorEngine(new Uint8Array(b)))
    .then((engine) => ({ engine, ...BUILTIN_PROFILE }))
  builtin.catch(() => (builtin = null))
  return builtin
}

/** A custom profile (cached by its content). */
export function customProfile(p: CustomProfile): Promise<LoadedProfile> {
  const key = `${p.fileName}:${p.data.length}:${p.data.slice(0, 64)}:${p.data.slice(-64)}`
  let out = custom.get(key)
  if (!out) {
    out = loadColorEngine(toBytes(p.data)).then((engine) => ({
      engine,
      condition: engine.description,
      name: `${engine.description} (${p.fileName})`,
    }))
    out.catch(() => custom.delete(key))
    custom.set(key, out)
  }
  return out
}

/** Read an .icc file for storing: checks it is a CMYK printer profile first. */
export async function readCustomProfile(file: File): Promise<CustomProfile> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const engine = await loadColorEngine(bytes)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { fileName: file.name, description: engine.description, data: btoa(s) }
}
