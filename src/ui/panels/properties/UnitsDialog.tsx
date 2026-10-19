import { Button } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { useUi } from '@/ui/uiStore'
import { ProjectUnitsControls } from './UnitsControls'

/** ☰ → Units…: the units lengths are shown in for this project. */
export function UnitsDialog() {
  const open = useUi((s) => s.unitsOpen)
  const close = () => useUi.getState().setUnitsOpen(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        title="Units"
        description="Sizes and positions are shown and typed in this unit. Pixels are counted at the print resolution you set."
      >
        <ProjectUnitsControls />
        <div className="mt-2 flex justify-end">
          <Button onClick={close}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
