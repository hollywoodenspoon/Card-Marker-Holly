import { usePasteImages } from '@/ui/actions/usePaste'
import { useShortcuts } from '@/ui/actions/useShortcuts'
import { ExportImagesDialog } from '@/ui/export/ExportImagesDialog'
import { TtsDialog } from '@/ui/export/TtsDialog'
import { FindReplaceDialog } from '@/ui/find/FindReplaceDialog'
import { KeywordsDialog } from '@/ui/keywords/KeywordsDialog'
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
  const shell =
    layout === 'phone' ? <PhoneShell /> : layout === 'tablet' ? <TabletShell /> : <DesktopShell />
  return (
    <>
      {shell}
      {galleryOpen && <GalleryView />}
      {printOpen && <PrintView layout={layout} />}
      <ExportImagesDialog />
      <KeywordsDialog />
      <FindReplaceDialog />
      <TtsDialog />
    </>
  )
}
