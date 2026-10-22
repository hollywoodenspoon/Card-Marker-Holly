import { lazy, Suspense, useEffect } from 'react'
import { usePasteImages } from '@/ui/actions/usePaste'
import { useShortcuts } from '@/ui/actions/useShortcuts'
import { ExportImagesDialog } from '@/ui/export/ExportImagesDialog'
import { GamePackDialog } from '@/ui/export/GamePackDialog'
import { TtsDialog } from '@/ui/export/TtsDialog'
import { UnitsDialog } from '@/ui/panels/properties/UnitsDialog'
import { FindReplaceDialog } from '@/ui/find/FindReplaceDialog'
import { DataView } from '@/ui/data/DataView'
import { GalleryView } from '@/ui/gallery/GalleryView'
import { PrintView } from '@/ui/print/PrintView'
import { followModeWithTabs } from '@/ui/panels/editMode'
import { useUi } from '@/ui/uiStore'
import { DesktopShell } from './DesktopShell'
import { PhoneShell } from './PhoneShell'
import { TabletShell } from './TabletShell'
import { useLayout } from './useLayout'

// The Vector Maker (and paper.js) download only when it is opened.
const VectorMaker = lazy(() => import('@/vector/ui/VectorMaker'))

export function AppShell() {
  const layout = useLayout()
  useShortcuts()
  usePasteImages()
  useEffect(followModeWithTabs, [])
  const printOpen = useUi((s) => s.printOpen)
  const galleryOpen = useUi((s) => s.galleryOpen)
  const dataOpen = useUi((s) => !!s.dataView)
  const vectorOpen = useUi((s) => !!s.vectorOpen)
  const shell =
    layout === 'phone' ? <PhoneShell /> : layout === 'tablet' ? <TabletShell /> : <DesktopShell />
  return (
    <>
      {shell}
      {galleryOpen && <GalleryView />}
      {dataOpen && <DataView />}
      {vectorOpen && (
        <Suspense fallback={null}>
          <VectorMaker />
        </Suspense>
      )}
      {printOpen && <PrintView layout={layout} />}
      <ExportImagesDialog />
      <FindReplaceDialog />
      <TtsDialog />
      <GamePackDialog />
      <UnitsDialog />
    </>
  )
}
