// Types for the parts of the vendored lcms-wasm build that the colour engine uses.
export type Handle = number

export interface Lcms {
  cmsOpenProfileFromMem(data: Uint8Array, size: number): Handle
  cmsCreate_sRGBProfile(): Handle
  cmsCloseProfile(profile: Handle): void
  cmsGetProfileInfoASCII(profile: Handle, info: number, lang: string, country: string): string
  cmsGetColorSpaceASCII(profile: Handle): string
  cmsCreateTransform(
    input: Handle,
    inputFormat: number,
    output: Handle,
    outputFormat: number,
    intent: number,
    flags: number,
  ): Handle
  cmsDeleteTransform(transform: Handle): void
  // Uint8Array for 8-bit output formats, Uint16Array for 16-bit ones.
  cmsDoTransform(transform: Handle, input: ArrayLike<number>, pixels: number): Uint8Array
}

export function instantiate(opts?: { locateFile?: (name: string) => string }): Promise<Lcms>
export default instantiate

export const TYPE_RGB_8: number
export const TYPE_RGB_16: number
export const TYPE_CMYK_8: number
export const TYPE_CMYK_16: number
export const INTENT_RELATIVE_COLORIMETRIC: number
export const cmsFLAGS_BLACKPOINTCOMPENSATION: number
export const cmsInfoDescription: number
