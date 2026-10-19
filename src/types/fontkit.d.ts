// Minimal typings for the parts of fontkit used by the PDF export.
declare module 'fontkit' {
  export interface PathCommand {
    command: 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'bezierCurveTo' | 'closePath'
    args: number[]
  }
  export interface Glyph {
    id: number
    path: { commands: PathCommand[] }
  }
  export interface GlyphPosition {
    xAdvance: number
    yAdvance: number
    xOffset: number
    yOffset: number
  }
  export interface Font {
    familyName: string
    subfamilyName: string
    unitsPerEm: number
    ascent: number
    descent: number
    hasGlyphForCodePoint(cp: number): boolean
    layout(text: string): { glyphs: Glyph[]; positions: GlyphPosition[] }
  }
  export function create(buffer: Uint8Array): Font
  const fontkit: { create: typeof create }
  export default fontkit
}
