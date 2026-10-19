import { DEFAULT_TEXT_STYLE, richTextFromPlain } from '../text/richtext'
import { DEFAULT_PRESET_ID, presetSize } from '../units/presets'
import { newId } from './ids'
import type {
  Card,
  CardSize,
  ElementBase,
  GroupElement,
  IconRowElement,
  ImageElement,
  ImageFieldElement,
  Project,
  ShapeElement,
  Side,
  Template,
  TextElement,
  Element,
} from './types'

const now = () => Date.now()

function base(
  name: string,
  box: { xMm: number; yMm: number; wMm: number; hMm: number },
): ElementBase {
  return {
    id: newId(),
    name,
    ...box,
    rotation: 0,
    opacity: 1,
    flipX: false,
    flipY: false,
    defaultVisible: true,
    toggleLocked: false,
    editLocked: false,
  }
}

type Box = { xMm: number; yMm: number; wMm: number; hMm: number }

export function createText(box: Box, opts: Partial<TextElement> = {}): TextElement {
  const name = opts.name ?? 'Text'
  return {
    ...base(name, box),
    type: 'text',
    fieldName: opts.fieldName ?? name,
    defaultText: richTextFromPlain('Text'),
    baseStyle: { ...DEFAULT_TEXT_STYLE },
    align: 'left',
    lineHeight: 1.2,
    vAlign: 'top',
    paddingMm: 0,
    autoShrink: { enabled: true, minPt: 5 },
    ...opts,
  }
}

export function createImageField(
  box: Box,
  opts: Partial<ImageFieldElement> = {},
): ImageFieldElement {
  const name = opts.name ?? 'Art'
  return {
    ...base(name, box),
    type: 'imageField',
    fieldName: opts.fieldName ?? name,
    fit: 'fill',
    placeholderColor: '#d9d9de',
    radiusMm: 0,
    ...opts,
  }
}

export function createIconRow(box: Box, opts: Partial<IconRowElement> = {}): IconRowElement {
  const name = opts.name ?? 'Stat'
  return {
    ...base(name, box),
    type: 'iconRow',
    fieldName: opts.fieldName ?? name,
    defaultCount: 3,
    direction: 'horizontal',
    iconMm: Math.min(box.wMm, box.hMm),
    gapMm: 1,
    fitToBox: true,
    ...opts,
  }
}

export function createShape(box: Box, opts: Partial<ShapeElement> = {}): ShapeElement {
  return {
    ...base(opts.name ?? 'Shape', box),
    type: 'shape',
    kind: 'rect',
    fill: '#0e9494',
    stroke: null,
    strokeMm: 0.5,
    radiusMm: 0,
    ...opts,
  }
}

export function createImage(
  box: Box,
  assetId: string,
  opts: Partial<ImageElement> = {},
): ImageElement {
  return { ...base(opts.name ?? 'Image', box), type: 'image', assetId, ...opts }
}

export function createGroup(children: Element[], name = 'Group'): GroupElement {
  return { ...base(name, { xMm: 0, yMm: 0, wMm: 0, hMm: 0 }), type: 'group', children }
}

export function createTemplate(
  projectId: string,
  side: Side,
  size: CardSize,
  name: string,
  elements: Element[] = [],
): Template {
  const t = now()
  return {
    id: newId(),
    projectId,
    name,
    side,
    size,
    elements,
    guides: [],
    createdAt: t,
    updatedAt: t,
  }
}

export function createCard(
  projectId: string,
  order: number,
  frontTemplateId: string | null,
  backTemplateId: string | null,
  name = 'Card',
): Card {
  const t = now()
  return {
    id: newId(),
    projectId,
    name,
    order,
    frontTemplateId,
    backTemplateId,
    fields: {},
    overrides: {},
    local: { front: [], back: [] },
    createdAt: t,
    updatedAt: t,
  }
}

/** A starter front layout so a new user has something to fill in right away. */
export function starterFrontElements(size: CardSize, bleedMm: number): Element[] {
  const { widthMm: w, heightMm: h } = size
  const m = 4
  const landscape = w > h
  const art = landscape
    ? { xMm: m, yMm: m, wMm: h - 2 * m, hMm: h - 2 * m }
    : { xMm: m, yMm: m + 9, wMm: w - 2 * m, hMm: h * 0.45 }
  const textX = landscape ? art.xMm + art.wMm + 3 : m
  const textW = landscape ? w - textX - m : w - 2 * m
  const titleY = landscape ? m : m
  const bodyY = landscape ? m + 9 : art.yMm + art.hMm + 3
  return [
    createShape(
      { xMm: -bleedMm, yMm: -bleedMm, wMm: w + 2 * bleedMm, hMm: h + 2 * bleedMm },
      { name: 'Background', fill: '#f4efe6', toggleLocked: true },
    ),
    createImageField(art, { name: 'Art', radiusMm: 1.5 }),
    createText(
      { xMm: textX, yMm: titleY, wMm: textW, hMm: 7 },
      {
        name: 'Title',
        defaultText: richTextFromPlain('Card name'),
        baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 12, bold: true },
        vAlign: 'middle',
        toggleLocked: true,
      },
    ),
    createText(
      { xMm: textX, yMm: bodyY, wMm: textW, hMm: h - bodyY - m },
      {
        name: 'Rules',
        defaultText: richTextFromPlain('Describe what this card does.'),
        baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 8 },
      },
    ),
  ]
}

export function starterBackElements(size: CardSize, bleedMm: number): Element[] {
  const { widthMm: w, heightMm: h } = size
  return [
    createShape(
      { xMm: -bleedMm, yMm: -bleedMm, wMm: w + 2 * bleedMm, hMm: h + 2 * bleedMm },
      { name: 'Background', fill: '#2d2a4a', toggleLocked: true },
    ),
    createShape(
      { xMm: 4, yMm: 4, wMm: w - 8, hMm: h - 8 },
      { name: 'Border', fill: null, stroke: '#c9b88a', strokeMm: 0.8, radiusMm: 2 },
    ),
    createText(
      { xMm: 6, yMm: h / 2 - 6, wMm: w - 12, hMm: 12 },
      {
        name: 'Back title',
        defaultText: richTextFromPlain('Card Game'),
        baseStyle: { ...DEFAULT_TEXT_STYLE, sizePt: 16, bold: true, color: '#c9b88a' },
        align: 'center',
        vAlign: 'middle',
      },
    ),
  ]
}

export interface NewProjectBundle {
  project: Project
  templates: Template[]
  cards: Card[]
}

export function createProject(
  name = 'My card game',
  presetId = DEFAULT_PRESET_ID,
): NewProjectBundle {
  const t = now()
  const size = presetSize(presetId)
  const project: Project = {
    id: newId(),
    name,
    createdAt: t,
    updatedAt: t,
    defaultSize: size,
    bleedMm: 3,
    safeMm: 3,
    print: { paper: 'A4', marginMm: 5 },
  }
  const front = createTemplate(
    project.id,
    'front',
    size,
    'Basic front',
    starterFrontElements(size, 3),
  )
  const back = createTemplate(project.id, 'back', size, 'Basic back', starterBackElements(size, 3))
  const card = createCard(project.id, 1, front.id, back.id, 'Card 1')
  return { project, templates: [front, back], cards: [card] }
}
