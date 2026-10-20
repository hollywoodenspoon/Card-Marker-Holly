import { plainText } from './render'
import type { HelpTopic } from './topics'

export interface SearchHit {
  topic: HelpTopic
  /** A bit of the page around the first match. */
  snippet: string
}

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')

/**
 * Pages matching every word of the query, best first: title words count most,
 * then keywords, then how often the words appear in the text.
 */
export function searchHelp(
  query: string,
  topics: HelpTopic[],
  source: (id: string) => string | undefined,
): SearchHit[] {
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const hits: { hit: SearchHit; score: number }[] = []
  for (const topic of topics) {
    const text = plainText(source(topic.id) ?? '')
    const body = norm(text)
    const title = norm(topic.title)
    const keys = norm(topic.keywords ?? '')
    let score = 0
    let ok = true
    for (const w of words) {
      const inBody = body.split(w).length - 1
      const s = (title.includes(w) ? 20 : 0) + (keys.includes(w) ? 8 : 0) + Math.min(inBody, 10)
      if (!s) {
        ok = false
        break
      }
      score += s
    }
    if (!ok) continue
    const at = body.indexOf(words[0])
    const start = Math.max(0, at - 50)
    const snippet =
      at < 0
        ? text.slice(0, 110)
        : `${start > 0 ? '…' : ''}${text.slice(start, at + 70).trim()}${at + 70 < text.length ? '…' : ''}`
    hits.push({ hit: { topic, snippet }, score })
  }
  return hits.sort((a, b) => b.score - a.score).map((h) => h.hit)
}
