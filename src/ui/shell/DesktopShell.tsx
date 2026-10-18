import { LeftPanel } from '@/ui/panels/LeftPanel'
import { RightPane } from '@/ui/panels/RightPane'
import { TopBar } from '@/ui/toolbar/TopBar'
import { useUi } from '@/ui/uiStore'
import { CanvasArea } from '@/ui/canvas/CanvasArea'

export function DesktopShell() {
  const { leftTab, setLeftTab } = useUi()
  return (
    <div className="h-app flex flex-col">
      <TopBar layout="desktop" />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[340px] shrink-0 border-r bg-panel">
          <LeftPanel tab={leftTab} onTab={setLeftTab} className="flex-1" />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <CanvasArea layout="desktop" />
        </main>
        <aside className="w-[300px] shrink-0 border-l bg-panel">
          <RightPane />
        </aside>
      </div>
    </div>
  )
}
