import { lazy, Suspense, useEffect } from 'react'
import { useUi } from '@/ui/uiStore'
import { openHelp, topicForView } from './openHelp'

// Pages, renderer and view load only when Help is first opened.
const HelpView = lazy(() => import('./HelpView'))

/** Mounted once in App: shows Help over whatever is open. */
export function HelpHost() {
  const open = useUi((s) => !!s.help)
  useEffect(() => {
    // F1 anywhere: the page about what's on screen.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F1' || useUi.getState().help) return
      e.preventDefault()
      const topic = topicForView()
      // Help can't sit on top of a dialog: close export dialogs first.
      const ui = useUi.getState()
      if (ui.ttsOpen) ui.setTtsOpen(false)
      if (ui.imageExport) ui.setImageExport(null)
      openHelp(topic)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  if (!open) return null
  return (
    <Suspense fallback={<div className="fixed inset-0 z-[70] bg-background" />}>
      <HelpView />
    </Suspense>
  )
}
