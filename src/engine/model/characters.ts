/**
 * Characters with layered portraits. A portrait template lists the layers the
 * owner draws (skin, eyes, mouth, hair, clothes…), bottom to top. Each layer has
 * options (pictures), and a way to be recoloured in the Engine. Expressions
 * (Happy, Angry…) swap the pictures of some layers: an option can hold one
 * picture per expression, and falls back to its own picture otherwise.
 * A character picks a template, an option and a colour per layer, and has a name
 * and a name colour for the dialogue box. Pure data, no UI.
 */
import { newId } from '@/core/model/ids'
import type { ImageRef } from './game'

/**
 * How a layer takes its colour:
 * - ramp: the picture is drawn in greys; mid grey becomes the colour, darker greys
 *   its shadows and lighter greys its highlights, so the shading stays.
 * - hue: the picture is drawn in colour; each pixel turns to the colour's hue and
 *   keeps its own lightness and saturation (the fallback for coloured art).
 * - none: drawn as it is.
 */
export type Recolor = 'ramp' | 'hue' | 'none'

export interface PortraitOption {
  id: string
  name: string
  image: ImageRef | null
  /** This option's picture for an expression (by expression id), when it differs. */
  byExpression: Record<string, ImageRef>
}

export interface PortraitLayer {
  id: string
  name: string
  recolor: Recolor
  /** The colour a new character starts with. */
  color: string
  /** False: a character may leave this layer empty (no hat). */
  required: boolean
  /** Colours the character generator picks from (empty: the layer's own colour). */
  palette?: string[]
  options: PortraitOption[]
}

export interface Expression {
  id: string
  name: string
}

export interface PortraitTemplate {
  id: string
  name: string
  /** Size of the layer pictures in pixels (all layers share it). */
  width: number
  height: number
  /** Bottom to top. */
  layers: PortraitLayer[]
  /** The first is the neutral face (the options' own pictures). */
  expressions: Expression[]
}

export interface CharacterPart {
  option: string | null
  color: string
}

export interface Character {
  id: string
  name: string
  nameColor: string
  template: string | null
  /** By layer id. */
  parts: Record<string, CharacterPart>
  /** The game's own marks on a character: "important", "rival"… (free words). */
  flags?: string[]
}

export const newOption = (name: string, image: ImageRef | null = null): PortraitOption => ({
  id: newId(),
  name,
  image,
  byExpression: {},
})

export const newLayer = (name: string, recolor: Recolor = 'ramp'): PortraitLayer => ({
  id: newId(),
  name,
  recolor,
  color: '#c08060',
  required: true,
  options: [],
})

export function newPortraitTemplate(name = 'Portrait'): PortraitTemplate {
  return {
    id: newId(),
    name,
    width: 256,
    height: 256,
    layers: ['Skin', 'Eyes', 'Mouth', 'Hair', 'Clothes', 'Accessory'].map((n) => ({
      ...newLayer(n, n === 'Eyes' || n === 'Mouth' ? 'none' : 'ramp'),
      required: n !== 'Accessory',
    })),
    expressions: ['Neutral', 'Happy', 'Sad', 'Angry', 'Surprised'].map((n) => ({
      id: newId(),
      name: n,
    })),
  }
}

/** A character with each layer on its first option and default colour. */
export function newCharacter(name: string, template: PortraitTemplate | null): Character {
  const parts: Record<string, CharacterPart> = {}
  for (const l of template?.layers ?? [])
    parts[l.id] = { option: l.required ? (l.options[0]?.id ?? null) : null, color: l.color }
  return { id: newId(), name, nameColor: '#ffd27a', template: template?.id ?? null, parts }
}

/**
 * A made-up character: each layer gets a random option and, from the layer's
 * palette, a colour. `rnd` gives numbers in [0, 1) so the same stream gives the same
 * person (the model stays free of the league's random stream).
 */
export function generateCharacter(
  template: PortraitTemplate,
  rnd: () => number,
  name: string,
  id: string = newId(),
): Character {
  const pick = <T>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)]
  const parts: Record<string, CharacterPart> = {}
  for (const l of template.layers) {
    // A layer that may stay empty is left empty now and then.
    const used = l.options.length > 0 && (l.required || rnd() < 0.6)
    parts[l.id] = {
      option: used ? pick(l.options).id : null,
      color: l.palette?.length && l.recolor !== 'none' ? pick(l.palette) : l.color,
    }
  }
  return { id, name, nameColor: '#ffd27a', template: template.id, parts }
}

/** One layer as drawn: its picture, how to colour it, and the colour. */
export interface DrawnLayer {
  layer: string
  image: ImageRef
  recolor: Recolor
  color: string
}

/**
 * The layers to draw for a character with an expression (by id or name), bottom
 * to top. Layers with no option, or an option with no picture, are left out.
 */
export function portraitLayers(
  t: PortraitTemplate,
  c: Character,
  expression?: string | null,
): DrawnLayer[] {
  const ex = t.expressions.find(
    (e) => e.id === expression || e.name.toLowerCase() === expression?.toLowerCase(),
  )
  const out: DrawnLayer[] = []
  for (const l of t.layers) {
    const part = c.parts[l.id]
    const optId = part ? part.option : l.required ? l.options[0]?.id : null
    const opt = l.options.find((o) => o.id === optId)
    if (!opt) continue
    const image = (ex && opt.byExpression[ex.id]) || opt.image
    if (!image) continue
    out.push({ layer: l.id, image, recolor: l.recolor, color: part?.color ?? l.color })
  }
  return out
}

export const templateOf = (templates: PortraitTemplate[], c: Character | null | undefined) =>
  c?.template ? (templates.find((t) => t.id === c.template) ?? null) : null
