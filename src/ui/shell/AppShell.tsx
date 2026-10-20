import { lazy, Suspense } from 'react'
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

// The Vector Maker (and paper.js) download only when it is opened.
const VectorMaker = lazy(() => import('@/vector/ui/VectorMaker'))
const PlaytestView = lazy(() => import('@/ui/playtest/PlaytestView'))

export function AppShell() {
  const layout = useLayout()
  useShortcuts()
  usePasteImages()
  const printOpen = useUi((s) => s.printOpen)
  const galleryOpen = useUi((s) => s.galleryOpen)
  const dataOpen = useUi((s) => !!s.dataView)
  const vectorOpen = useUi((s) => !!s.vectorOpen)
  const playtestOpen = useUi((s) => s.playtestOpen)
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
      {playtestOpen && (
        <Suspense fallback={null}>
          <PlaytestView layout={layout} />
        </Suspense>
      )}
      {printOpen && <PrintView layout={layout} />}
      <ExportImagesDialog />
      <KeywordsDialog />
      <FindReplaceDialog />
      <TtsDialog />
      <UnitsDialog />
    </>
  )
}
