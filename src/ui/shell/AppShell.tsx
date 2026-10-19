import { usePasteImages } from '@/ui/actions/usePaste'
import { useShortcuts } from '@/ui/actions/useShortcuts'
import { ExportImagesDialog } from '@/ui/export/ExportImagesDialog'
import { TtsDialog } from '@/ui/export/TtsDialog'
import { UnitsDialog } from '@/ui/panels/properties/UnitsDialog'
import { FindReplaceDialog } from '@/ui/find/FindReplaceDialog'
import { KeywordsDialog } from '@/ui/keywords/KeywordsDialog'
import { DataView } from '@/ui/data/DataView'
import { GalleryView } from '@/ui/gallery/GalleryView'
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
  const galleryOpen = useUi((s) => s.galleryOpen)
  const dataOpen = useUi((s) => !!s.dataView)
  const shell =
    layout === 'phone' ? <PhoneShell /> : layout === 'tablet' ? <TabletShell /> : <DesktopShell />
  return (
    <>
      {shell}
      {galleryOpen && <GalleryView />}
      {dataOpen && <DataView />}
      {printOpen && <PrintView layout={layout} />}
      <ExportImagesDialog />
      <KeywordsDialog />
      <FindReplaceDialog />
      <TtsDialog />
      <UnitsDialog />
    </>
  )
}
