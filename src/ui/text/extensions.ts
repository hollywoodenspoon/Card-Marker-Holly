import { Extension } from '@tiptap/core'
import { TextAlign } from '@tiptap/extension-text-align'
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import StarterKit from '@tiptap/starter-kit'

/** Letter spacing as a textStyle attribute (em). */
const LetterSpacing = Extension.create({
  name: 'letterSpacing',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (el) => el.style.letterSpacing || null,
            renderHTML: (attrs) =>
              attrs.letterSpacing ? { style: `letter-spacing: ${attrs.letterSpacing}` } : {},
          },
        },
      },
    ]
  },
})

/** Line height per paragraph (unitless multiple). */
const ParagraphLineHeight = Extension.create({
  name: 'paragraphLineHeight',
  addGlobalAttributes() {
    return [
      {
        types: ['paragraph'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el) => el.style.lineHeight || null,
            renderHTML: (attrs) =>
              attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
          },
        },
      },
    ]
  },
})

export const editorExtensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    link: false,
    hardBreak: false,
    dropcursor: false,
    gapcursor: false,
    trailingNode: false,
  }),
  TextStyle,
  FontFamily,
  FontSize,
  Color,
  LetterSpacing,
  ParagraphLineHeight,
  TextAlign.configure({ types: ['paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
]
