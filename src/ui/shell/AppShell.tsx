import { usePasteImages } from '@/ui/actions/usePaste'
import { useShortcuts } from '@/ui/actions/useShortcuts'
import { ExportImagesDialog } from '@/ui/export/ExportImagesDialog'
import { PrintView } from '@/ui/print/PrintView'
import { useUi } from '@/ui/uiStore'
import { DesktopShell } from './DesktopShell'
import { PhoneShell } from './PhoneShell'
import { TabletShell } from './TabletShell'
import { useLayout } from './useLayout'

export function AppShell() {
  const layout = useLayout()
  useShortcuts()
  usePasteImages()
  const printOpen = useUi((s) => s.printOpen)
  const shell =
    layout === 'phone' ? <PhoneShell /> : layout === 'tablet' ? <TabletShell /> : <DesktopShell />
  return (
    <>
      {shell}
      {printOpen && <PrintView layout={layout} />}
      <ExportImagesDialog />
    </>
  )
}
