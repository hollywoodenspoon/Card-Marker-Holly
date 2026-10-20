import { HELP_TOPICS, type HelpTopic } from './topics'

/** Every page's Markdown, bundled with the Help chunk (works offline). */
const files = import.meta.glob('./pages/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** A page's Markdown, with Windows line endings (from some checkouts or editors) made plain. */
export const pageSource = (id: string): string | undefined =>
  files[`./pages/${id}.md`]?.replace(/\r\n?/g, '\n')

export const pageIds = () => Object.keys(files).map((f) => f.replace(/^\.\/pages\/|\.md$/g, ''))

export const topicById = (id: string): HelpTopic | undefined => HELP_TOPICS.find((t) => t.id === id)
