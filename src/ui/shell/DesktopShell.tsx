import { ResizablePanel } from '@/ui/components/ResizablePanel'
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
        <ResizablePanel
          id="cards-left"
          side="left"
          initial={340}
          min={280}
          max={720}
          label="left"
          className="flex border-r bg-panel"
        >
          <LeftPanel tab={leftTab} onTab={setLeftTab} className="min-w-0 flex-1" />
        </ResizablePanel>
        <main className="flex min-w-0 flex-1 flex-col">
          <CanvasArea layout="desktop" />
        </main>
        <ResizablePanel
          id="cards-right"
          side="right"
          initial={300}
          min={260}
          max={560}
          label="properties"
          className="border-l bg-panel"
        >
          <RightPane />
        </ResizablePanel>
      </div>
    </div>
  )
}
