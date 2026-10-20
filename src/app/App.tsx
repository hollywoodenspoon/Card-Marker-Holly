import { useEffect, useState } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { loadBuiltinFonts } from '@/assets/fonts'
import { startAutosave } from '@/storage/autosave'
import { folderStore, getBackend } from '@/storage'
import { FeedbackHost } from '@/ui/components/FeedbackHost'
import { ChooseFolder } from '@/ui/home/ChooseFolder'
import { HomeScreen } from '@/ui/home/HomeScreen'
import { PwaToast } from '@/ui/pwa/PwaToast'
import { AppShell } from '@/ui/shell/AppShell'
import { openProject, setAutosaveFlusher } from './session'

export function App() {
  const hasDoc = useEditor((s) => !!s.doc)
  const [ready, setReady] = useState(false)
  // Android: projects need a folder before anything else.
  const [needsFolder, setNeedsFolder] = useState(false)

  useEffect(() => {
    const saver = startAutosave(useEditor)
    setAutosaveFlusher(saver.flush)
    void (async () => {
      await loadBuiltinFonts()
      const folders = folderStore()
      if (folders && !(await folders.hasProjectsDir())) {
        setNeedsFolder(true)
        setReady(true)
        return
      }
      const last = await getBackend().getSetting<string | null>('lastProjectId')
      if (last) await openProject(last)
      setReady(true)
    })()
    return () => saver.stop()
  }, [])

  if (!ready) return <div className="h-app bg-background" />
  return (
    <>
      {needsFolder ? (
        <ChooseFolder onChosen={() => setNeedsFolder(false)} />
      ) : hasDoc ? (
        <AppShell />
      ) : (
        <HomeScreen />
      )}
      <PwaToast />
      <FeedbackHost />
    </>
  )
}
