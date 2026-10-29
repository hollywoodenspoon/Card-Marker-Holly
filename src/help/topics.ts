/**
 * The Help pages, in reading order. Each page is src/help/pages/<id>.md and
 * starts with "# <title>". Keywords help search find a page by other words.
 */
export interface HelpTopic {
  id: string
  title: string
  section: string
  keywords?: string
}

const ALL_SECTIONS = [
  'Start',
  'Editor',
  'Content',
  'Templates',
  'Cards',
  'Vector Maker',
  'Output',
  'Reference',
] as const

export const HELP_TOPICS: HelpTopic[] = [
  // Start
  {
    id: 'getting-started',
    title: 'Getting started',
    section: 'Start',
    keywords: 'first card new begin tutorial',
  },
  {
    id: 'projects',
    title: 'Projects, saving and backups',
    section: 'Start',
    keywords: 'home import export backup autosave saved',
  },
  ...(__COZY__
    ? [
        {
          id: 'desktop-app',
          title: 'The Windows app',
          section: 'Start',
          keywords: 'install windows exe portable folder',
        },
      ]
    : [
        {
          id: 'desktop-app',
          title: 'Desktop app (Arch Linux and CachyOS)',
          section: 'Start',
          keywords: 'install linux cachyos arch pacman folder windows cozy',
        },
        {
          id: 'website',
          title: 'Website and offline use',
          section: 'Start',
          keywords: 'browser install pwa offline storage',
        },
      ]),
  // Editor
  {
    id: 'workspace',
    title: 'The workspace',
    section: 'Editor',
    keywords: 'layout panels rail toolbar phone tablet desktop',
  },
  {
    id: 'canvas',
    title: 'Canvas: zoom, pan, snapping and undo',
    section: 'Editor',
    keywords: 'zoom pan rulers guides snap undo redo grid',
  },
  {
    id: 'card-size',
    title: 'Card size, bleed and safe area',
    section: 'Editor',
    keywords: 'preset poker tcg mm inches units bleed safe orientation',
  },
  {
    id: 'layers',
    title: 'Layers, groups and alignment',
    section: 'Editor',
    keywords: 'order lock hide rename group align distribute',
  },
  // Content
  {
    id: 'text',
    title: 'Text',
    section: 'Content',
    keywords: 'font bold italic size colour auto-shrink outline shadow line height',
  },
  {
    id: 'keywords-numbers',
    title: 'Keywords, card numbers and symbols',
    section: 'Content',
    keywords: 'keyword styling {#} number inline symbol icon {fire}',
  },
  {
    id: 'images',
    title: 'Images and art boxes',
    section: 'Content',
    keywords: 'picture upload crop fit fill flip rotate dpi svg',
  },
  {
    id: 'assets',
    title: 'Assets and folders',
    section: 'Content',
    keywords: 'upload library folder images tags',
  },
  { id: 'fonts', title: 'Fonts', section: 'Content', keywords: 'ttf otf upload custom font' },
  {
    id: 'icon-rows',
    title: 'Icon rows and grey icons',
    section: 'Content',
    keywords: 'stats count icons greyscale',
  },
  {
    id: 'find-replace',
    title: 'Find and replace',
    section: 'Content',
    keywords: 'search replace text all cards',
  },
  // Templates
  {
    id: 'templates',
    title: 'Templates and fields',
    section: 'Templates',
    keywords: 'layout field template library duplicate live',
  },
  {
    id: 'part-toggles',
    title: 'Turning parts on and off',
    section: 'Templates',
    keywords: 'hide show per card toggle conditional parts showIf',
  },
  {
    id: 'fronts-backs',
    title: 'Fronts and backs',
    section: 'Templates',
    keywords: 'back template shared deck',
  },
  {
    id: 'style-presets',
    title: 'Style presets',
    section: 'Templates',
    keywords: 'shared font colour style',
  },
  // Cards
  {
    id: 'cards',
    title: 'Cards list and editing many cards',
    section: 'Cards',
    keywords: 'duplicate reorder search multi select bulk',
  },
  { id: 'decks', title: 'Decks', section: 'Cards', keywords: 'copies count deck list' },
  {
    id: 'card-data',
    title: 'Card data table and CSV',
    section: 'Cards',
    keywords: 'table spreadsheet csv export values',
  },
  {
    id: 'mail-merge',
    title: 'Mail merge from a spreadsheet',
    section: 'Cards',
    keywords: 'csv xlsx excel import rows cards',
  },
  // Vector Maker
  ...(__COZY__
    ? []
    : [
        {
          id: 'vector-basics',
          title: 'Drawing shapes',
          section: 'Vector Maker',
          keywords: 'vector shapes layers svg artboard',
        },
        {
          id: 'vector-pen',
          title: 'The pen tool',
          section: 'Vector Maker',
          keywords: 'pen bezier anchor handle illustrator path',
        },
        {
          id: 'vector-combine',
          title: 'Combining shapes',
          section: 'Vector Maker',
          keywords: 'pathfinder union subtract intersect boolean',
        },
        {
          id: 'vector-trace',
          title: 'Tracing an image',
          section: 'Vector Maker',
          keywords: 'trace raster to vector colours',
        },
        {
          id: 'vector-save',
          title: 'Saving drawings',
          section: 'Vector Maker',
          keywords: 'svg png jpeg pdf export assets draft',
        },
      ]),
  // Output
  {
    id: 'printing',
    title: 'Printing on paper',
    section: 'Output',
    keywords: 'pdf a4 sheet cut marks guides gap draft print',
  },
  {
    id: 'double-sided',
    title: 'Double-sided printing',
    section: 'Output',
    keywords: 'backs mirrored long edge short edge alignment test duplex',
  },
  {
    id: 'checking-print',
    title: 'Checking the print',
    section: 'Output',
    keywords: '100% scale actual size measure ruler',
  },
  {
    id: 'card-images',
    title: 'Card images',
    section: 'Output',
    keywords: 'png jpeg export image zip',
  },
  {
    id: 'tabletop-simulator',
    title: 'Tabletop Simulator',
    section: 'Output',
    keywords: 'tts deck sheet custom deck online',
  },
  {
    id: 'gallery',
    title: 'Gallery and proofreading',
    section: 'Output',
    keywords: 'overview proofread spelling review',
  },
  ...(__COZY__
    ? []
    : [
        {
          id: 'playtest',
          title: 'Playtesting your game',
          section: 'Output',
          keywords: 'playtest play test game pack cmpack table board tokens score fields',
        },
      ]),
  // Reference
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    section: 'Reference',
    keywords: 'keys hotkeys keyboard',
  },
  {
    id: 'touch',
    title: 'Touch gestures',
    section: 'Reference',
    keywords: 'pinch two finger tap phone tablet',
  },
  {
    id: 'settings',
    title: 'Settings',
    section: 'Reference',
    keywords: 'menu units help install updates',
  },
  {
    id: 'themes',
    title: 'Themes',
    section: 'Reference',
    keywords: 'dark light colour hearthside mage chocobo pastel high contrast',
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting and questions',
    section: 'Reference',
    keywords: 'faq problem blurry missing font backs not lining up where files',
  },
  {
    id: 'about',
    title: 'About and credits',
    section: 'Reference',
    keywords: 'version licence license icons game-icons lucide fonts credits name',
  },
]

/** Cozy Edition has no Vector Maker section. */
export const HELP_SECTIONS = __COZY__
  ? ALL_SECTIONS.filter((s) => s !== 'Vector Maker')
  : [...ALL_SECTIONS]

/** Pictures the pages may show (public/help/<id>.webp, made by scripts/help-screenshots.mjs). */
export const HELP_SHOTS = [
  'home',
  'new-project',
  'editor',
  'editor-phone',
  'canvas-zoom',
  'card-size',
  'layers',
  'add-menu',
  'text-editing',
  'text-props',
  'art-box',
  'image-props',
  'assets',
  'fonts',
  'icon-row',
  'templates',
  'template-mode',
  'part-toggles',
  'cards',
  'decks',
  'data-table',
  'mail-merge',
  'vector-maker',
  'trace',
  'vector-save',
  'gallery',
  'proofread',
  'game-pack',
  'playtest',
  'print',
  'print-settings',
  'card-images',
  'tts',
  'keywords',
  'find-replace',
  'settings-menu',
  'theme-picker',
] as const
