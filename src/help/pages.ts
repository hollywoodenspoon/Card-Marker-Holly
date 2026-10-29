import { HELP_TOPICS, type HelpTopic } from './topics'

/** Every page's Markdown, bundled with the Help chunk (works offline). */
// Cozy Edition leaves out the pages for features it doesn't have, and has its own versions of others.
const files = (
  __COZY__
    ? import.meta.glob(
        [
          './pages/*.md',
          '!./pages/vector-*.md',
          '!./pages/{playtest,website}.md',
          '!./pages/{about,assets,desktop-app,projects,settings,shortcuts}.md',
          '!./pages/{templates,themes,touch,troubleshooting,workspace}.md',
        ],
        { query: '?raw', import: 'default', eager: true },
      )
    : import.meta.glob('./pages/*.md', { query: '?raw', import: 'default', eager: true })
) as Record<string, string>

/** Cozy Edition's own versions of some pages, by the same file name. */
const cozyFiles = __COZY__
  ? (import.meta.glob('./cozy/*.md', { query: '?raw', import: 'default', eager: true }) as Record<
      string,
      string
    >)
  : {}

const source = (id: string) => cozyFiles[`./cozy/${id}.md`] ?? files[`./pages/${id}.md`]

const ids = [...Object.keys(files), ...Object.keys(cozyFiles)].map((f) =>
  f.replace(/^\.\/(?:pages|cozy)\/|\.md$/g, ''),
)

/** A page's Markdown, with Windows line endings (from some checkouts or editors) made plain. */
export const pageSource = (id: string): string | undefined => source(id)?.replace(/\r\n?/g, '\n')

export const pageIds = () => [...new Set(ids)]

export const topicById = (id: string): HelpTopic | undefined => HELP_TOPICS.find((t) => t.id === id)
