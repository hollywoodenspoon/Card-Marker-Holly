import { FolderOpen } from '@/ui/icons'
import { useState } from 'react'
import { APP_NAME } from '@/app/appInfo'
import { folderStore } from '@/storage'
import { Button } from '@/ui/components/ui/button'

/** Android first run (or after access to the folder was lost): where projects are kept. */
export function ChooseFolder({ onChosen }: { onChosen: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const choose = async () => {
    const folders = folderStore()
    if (!folders) return
    setError(null)
    try {
      const dir = await folders.bridge.pickFolder({ title: 'Choose a folder for your projects' })
      if (!dir) return
      await folders.setProjectsDir(dir)
      onChosen()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  return (
    <div className="h-app pt-safe pb-safe flex flex-col items-center justify-center overflow-auto px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-accent-soft">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-10" />
        </div>
        <h1 className="text-xl font-semibold">Where should your projects go?</h1>
        <p className="text-sm text-muted-foreground">
          {APP_NAME} saves each project as a folder of ordinary files, so you can copy them to a
          computer or a backup. Pick a folder, or make one: tap <b>Documents</b>, then the
          new-folder button, and name it “{APP_NAME}”.
        </p>
        <Button onClick={choose} className="w-full sm:w-auto">
          <FolderOpen /> Choose a folder
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
