/**
 * Document model. All geometry is in millimetres; font sizes are in points.
 * Nothing here knows about storage, rendering libraries, or the UI.
 */

export type Id = string
export type Side = 'front' | 'back'
export type Orientation = 'portrait' | 'landscape'

export interface CardSize {
  presetId: string
  widthMm: number
  heightMm: number
}

export type PrintOrientation = 'auto' | 'portrait' | 'landscape'
export type FlipEdge = 'long' | 'short'
export type PrintSheets = 'both' | 'fronts' | 'backs'
/** How the bleed is filled when printing: from the card edge, or only what was drawn there. */
export type BleedFill = 'mirror' | 'stretch' | 'off'

/** Stored per project. Older projects may lack fields; see print/settings.ts. */
export interface PrintSettings {
  paper: 'A4'
  /** Unprintable border the printer needs, mm. */
  marginMm: number
  orientation?: PrintOrientation
  cutMarks?: boolean
  markLengthMm?: number
  /** Run cut marks from the gap out to the paper edge instead of a fixed length. */
  markToEdge?: boolean
  /** Gap between the bleed edge and the start of a cut mark, mm. */
  markOffsetMm?: number
  guideLines?: boolean
  /** Old on/off switch for backs; replaced by `sheets`, still read for older projects. */
  includeBacks?: boolean
  /** Which sheets to print. */
  sheets?: PrintSheets
  /** Must match the printer's duplex setting. */
  flip?: FlipEdge
  /** Nudge the backs sheet to compensate printer drift, mm. */
  backOffsetXMm?: number
  backOffsetYMm?: number
  bleedFill?: BleedFill
  /** Copies to print per card id; missing means 1, 0 leaves the card out. */
  copies?: Record<Id, number>
  /** Custom print order (card ids); null follows the Cards list. */
  order?: Id[] | null
}

export interface Project {
  id: Id
  name: string
  createdAt: number
  updatedAt: number
  /** Size used for new templates. */
  defaultSize: CardSize
  bleedMm: number
  safeMm: number
  print: PrintSettings
  /** Last mail merge choices, so the next merge starts with them. */
  merge?: MergeSettings
  /** Words styled automatically in every text (e.g. Flying in bold red). */
  keywords?: Keyword[]
  /** Number of the first card for `{#}` (default 1). */
  numberStart?: number
}

/** A word or phrase that gets its own style wherever it appears in card text. */
export interface Keyword {
  id: Id
  word: string
  style: Partial<TextStyle>
}

export type MergeMode = 'merge' | 'add'

export interface MergeSettings {
  /** Columns (letters) for the card name, print copies and per-row template names. */
  nameColumn?: string
  copiesColumn?: string
  frontColumn?: string
  backColumn?: string
  /** First spreadsheet row to read (1-based). */
  firstRow?: number
  /** Rows to read, e.g. "2-20, 25"; empty reads every row from `firstRow`. */
  rows?: string
  /** Rows to leave out, e.g. "7, 12-14". */
  skip?: string
  /** Update cards made from earlier merges, or always add new cards. */
  mode?: MergeMode
  frontTemplateId?: Id | null
  backTemplateId?: Id | null
}

export interface Guide {
  id: Id
  axis: 'x' | 'y'
  posMm: number
}

export interface Template {
  id: Id
  projectId: Id
  name: string
  side: Side
  size: CardSize
  elements: Element[]
  guides: Guide[]
  thumbnail?: Blob
  createdAt: number
  updatedAt: number
}

// ---------- rich text ----------

export interface TextStyle {
  fontFamily: string
  sizePt: number
  color: string
  bold: boolean
  italic: boolean
  underline: boolean
  /** Extra spacing between characters, in em. */
  letterSpacingEm: number
  /** Outline around the letters (none when unset). */
  outlineColor?: string
  /** Outline thickness, as a fraction of the font size. */
  outlineWidthEm?: number
  /** Hard drop shadow (no blur, so screen and PDF match). */
  shadowColor?: string
  shadowDxEm?: number
  shadowDyEm?: number
  shadowOpacity?: number
}

export type TextAlign = 'left' | 'center' | 'right' | 'justify'

export interface TextRun {
  text: string
  /** Only properties that differ from the element's base style. */
  style?: Partial<TextStyle>
}

export interface Paragraph {
  align?: TextAlign
  /** Line height as a multiple of the font size. */
  lineHeight?: number
  runs: TextRun[]
}

export interface RichText {
  paragraphs: Paragraph[]
}

// ---------- elements ----------

export interface ElementBase {
  id: Id
  name: string
  xMm: number
  yMm: number
  wMm: number
  hMm: number
  /** Degrees, clockwise, around the element's top-left corner (Konva convention). */
  rotation: number
  opacity: number
  flipX: boolean
  flipY: boolean
  /** Shown by default on cards using this template. */
  defaultVisible: boolean
  /** Cannot be toggled per card. */
  toggleLocked: boolean
  /** Locked in the layers panel: cannot be selected or moved on the canvas. */
  editLocked: boolean
  /**
   * Card-only elements: drawn directly below this top-level template element.
   * Unset (or a missing id) means above all template parts.
   */
  zBelow?: Id
  /** Only shown on cards where this rule holds (e.g. Rarity is Rare). */
  showIf?: ShowRule
}

export type ShowRuleOp = 'is' | 'isNot' | 'contains' | 'empty' | 'notEmpty'

/** A condition on one of the card's field values. Matching ignores case. */
export interface ShowRule {
  field: string
  op: ShowRuleOp
  value?: string
}

export type VAlign = 'top' | 'middle' | 'bottom'

export interface TextElement extends ElementBase {
  type: 'text'
  /** Card values are looked up by this name. */
  fieldName: string
  /** Spreadsheet column (A, B, … AA) this field reads in a mail merge. */
  mergeColumn?: string
  /** Linked shared style: its values override `baseStyle` (see templates/resolve). */
  stylePresetId?: Id
  defaultText: RichText
  baseStyle: TextStyle
  align: TextAlign
  lineHeight: number
  vAlign: VAlign
  paddingMm: number
  autoShrink: { enabled: boolean; minPt: number }
  /** Apply the project's keyword styles to this text (default on). */
  styleKeywords?: boolean
}

export type ImageFit = 'fill' | 'fit'

export interface ImageFieldElement extends ElementBase {
  type: 'imageField'
  fieldName: string
  /** Spreadsheet column (A, B, … AA) this field reads in a mail merge. */
  mergeColumn?: string
  defaultAssetId?: Id
  fit: ImageFit
  /** Placeholder background shown when the frame is empty. */
  placeholderColor: string
  radiusMm: number
}

export type ShapeKind = 'rect' | 'ellipse' | 'line'

export interface ShapeElement extends ElementBase {
  type: 'shape'
  kind: ShapeKind
  fill: string | null
  stroke: string | null
  strokeMm: number
  radiusMm: number
  /** Hard drop shadow behind the shape. */
  shadow?: ShapeShadow
}

export interface ShapeShadow {
  color: string
  dxMm: number
  dyMm: number
  opacity: number
}

/** Normalised crop rectangle (0..1) of the source image. */
export interface Crop {
  x: number
  y: number
  w: number
  h: number
}

export interface ImageElement extends ElementBase {
  type: 'image'
  assetId: Id
  crop?: Crop
}

export interface GroupElement extends ElementBase {
  type: 'group'
  /** Children are positioned in card coordinates; the group's own box is derived. */
  children: Element[]
}

export type IconRowDirection = 'horizontal' | 'vertical'

/** The same icon repeated N times, centred in the box (stats shown as icons). */
export interface IconRowElement extends ElementBase {
  type: 'iconRow'
  fieldName: string
  /** Spreadsheet column (A, B, … AA) this field reads in a mail merge. */
  mergeColumn?: string
  /** Icon picture (from the template). */
  assetId?: Id
  /** Count shown on cards that don't set their own. */
  defaultCount: number
  direction: IconRowDirection
  /** Size of each icon cell, mm. */
  iconMm: number
  gapMm: number
  /** Shrink icons and gaps together when the row would overflow the box. */
  fitToBox: boolean
}

export type Element =
  TextElement | ImageFieldElement | ShapeElement | ImageElement | GroupElement | IconRowElement
export type ElementType = Element['type']
export type FieldElement = TextElement | ImageFieldElement | IconRowElement

// ---------- cards ----------

export interface TextValue {
  kind: 'text'
  text: RichText
}

export interface ImageValue {
  kind: 'image'
  assetId?: Id
  fit?: ImageFit
  /** Offset of the image centre from the frame centre, in mm. */
  offsetXMm: number
  offsetYMm: number
  /** Extra zoom on top of fit/fill (1 = none). */
  zoom: number
}

export interface CountValue {
  kind: 'count'
  count: number
}

export type FieldValue = TextValue | ImageValue | CountValue

export interface ElementOverride {
  visible?: boolean
}

export interface Card {
  id: Id
  projectId: Id
  name: string
  /** Sort key (fractional ordering). */
  order: number
  frontTemplateId: Id | null
  backTemplateId: Id | null
  /** Keyed by field NAME so values survive template switches. */
  fields: Record<string, FieldValue>
  /** Keyed by template element ID. Only differences from the template. */
  overrides: Record<Id, ElementOverride>
  /** Card-only elements drawn above the template. */
  local: Record<Side, Element[]>
  /** Spreadsheet row this card was made from by a mail merge (1-based). */
  mergeRow?: number
  thumbnail?: Blob
  createdAt: number
  updatedAt: number
}

// ---------- assets ----------

export interface Asset {
  id: Id
  projectId: Id
  name: string
  mime: string
  blob: Blob
  widthPx: number
  heightPx: number
  isVector: boolean
  /** Used by inline symbols (Shot 2), e.g. ["fire"]. */
  tags: string[]
  createdAt: number
}

export interface FontAsset {
  id: Id
  projectId: Id
  family: string
  /** CSS font-weight and font-style descriptors for this file. */
  weight: string
  style: string
  fileName: string
  blob: Blob
  createdAt: number
}

export interface StylePreset {
  id: Id
  projectId: Id
  name: string
  style: Partial<TextStyle>
}
