import { useUi } from '@/ui/uiStore'

const KEY = 'cardmaker.helpTopic'

/** The page Help last showed (per device). */
export function lastHelpTopic(): string {
  try {
    return localStorage.getItem(KEY) || 'getting-started'
  } catch {
    return 'getting-started'
  }
}

export function rememberHelpTopic(topic: string) {
  try {
    localStorage.setItem(KEY, topic)
  } catch {
    /* storage unavailable */
  }
}

/** Open Help at a page (default: the one read last). */
export function openHelp(topic?: string, anchor?: string) {
  useUi.getState().setHelp({ topic: topic ?? lastHelpTopic(), anchor })
}

/** The Help page for the full-screen view that's open, if any. */
export function topicForView(): string | undefined {
  const ui = useUi.getState()
  if (ui.printOpen) return 'printing'
  if (ui.galleryOpen) return 'gallery'
  if (ui.vectorOpen) return 'vector-basics'
  if (ui.dataView === 'import') return 'mail-merge'
  if (ui.dataView) return 'card-data'
  if (ui.ttsOpen) return 'tabletop-simulator'
  if (ui.imageExport) return 'card-images'
  return undefined
}
