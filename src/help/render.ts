import { Marked, type Tokens } from 'marked'
import { slug } from './slug'

export interface RenderedPage {
  title: string
  html: string
  /** The page's ## headings, for "On this page". */
  headings: { id: string; text: string }[]
}

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )

/**
 * Help Markdown → HTML. Besides plain Markdown:
 *   [[Ctrl+Z]]            a key cap
 *   [text](help:id#head)  a link to another Help page (handled in-app)
 *   [text](playtest/)     a link to the Playtest app (new tab)
 *   ![alt](shot.webp)     a screenshot from public/help/
 *   > **Tip:** …          a callout (also **Note:**)
 * Raw HTML in a page is shown as text, never run.
 */
export function renderHelp(md: string, imageBase: string): RenderedPage {
  const headings: RenderedPage['headings'] = []
  let title = ''
  const marked = new Marked({
    gfm: true,
    extensions: [
      {
        name: 'kbd',
        level: 'inline',
        start: (src: string) => src.indexOf('[['),
        tokenizer(src: string) {
          const m = /^\[\[([^\]\n]+)\]\]/.exec(src)
          if (m) return { type: 'kbd', raw: m[0], text: m[1] }
        },
        renderer: (t: Tokens.Generic) =>
          String(t.text)
            .split('+')
            .map((k) => `<kbd>${esc(k.trim())}</kbd>`)
            .join('<span class="kbd-plus">+</span>'),
      },
    ],
    renderer: {
      html: (t: Tokens.HTML | Tokens.Tag) => esc(t.text),
      heading(t: Tokens.Heading) {
        const text = this.parser.parseInline(t.tokens)
        if (t.depth === 1) {
          title = t.text
          return ''
        }
        const id = slug(t.text)
        if (t.depth === 2) headings.push({ id, text: t.text })
        return `<h${t.depth} id="${id}">${text}</h${t.depth}>`
      },
      link(t: Tokens.Link) {
        const text = this.parser.parseInline(t.tokens)
        const m = /^help:([\w-]+)(?:#([\w-]+))?$/.exec(t.href)
        if (m)
          return `<a href="#help/${m[1]}${m[2] ? `/${m[2]}` : ''}" data-help="${m[1]}"${m[2] ? ` data-anchor="${m[2]}"` : ''}>${text}</a>`
        // The Playtest app, served next to Card Maker (pictures live in <base>help/).
        if (t.href === 'playtest/')
          return `<a href="${imageBase}../playtest/" target="_blank" rel="noopener">${text}</a>`
        if (/^https:\/\//.test(t.href))
          return `<a href="${esc(t.href)}" target="_blank" rel="noopener noreferrer">${text}</a>`
        return text
      },
      image(t: Tokens.Image) {
        const file = /^[\w-]+\.webp$/.test(t.href) ? t.href : ''
        if (!file) return ''
        return `<figure><img src="${imageBase}${file}" alt="${esc(t.text)}" loading="lazy" decoding="async"><figcaption>${esc(t.text)}</figcaption></figure>`
      },
      blockquote(t: Tokens.Blockquote) {
        const body = this.parser.parse(t.tokens)
        const kind = /^\s*<p><strong>(Tip|Note):<\/strong>/.exec(body)?.[1]?.toLowerCase()
        return `<aside class="callout${kind ? ` callout-${kind}` : ''}">${body}</aside>`
      },
      table(t: Tokens.Table) {
        const cell = (c: Tokens.TableCell) => this.parser.parseInline(c.tokens)
        const head = t.header.map((c) => `<th>${cell(c)}</th>`).join('')
        const rows = t.rows.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join('')}</tr>`)
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`
      },
    },
  })
  const html = marked.parse(md, { async: false })
  return { title, html, headings }
}

/** Page text without Markdown, for search. */
export const plainText = (md: string) =>
  md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
