import { create } from 'zustand'
import type { PanelId } from './panels/panelIds'

/** Shell-only UI state: which panel/drawer/sheet is open. Not persisted with the project. */
interface UiState {
  leftTab: PanelId
  leftOpen: boolean // tablet drawer
  rightOpen: boolean // tablet drawer
  phoneSheet: PanelId | 'properties' | 'add' | null
  printOpen: boolean
  setPrintOpen: (o: boolean) => void
  /** Card image export dialog; `cardId` preselects one card. */
  imageExport: { cardId: string | null } | null
  keywordsOpen: boolean
  findOpen: boolean
  galleryOpen: boolean
  ttsOpen: boolean
  unitsOpen: boolean
  /** Vector Maker; `assetId` opens that asset for editing. */
  vectorOpen: { assetId: string | null } | null
  setVectorOpen: (v: UiState['vectorOpen']) => void
  setUnitsOpen: (o: boolean) => void
  setTtsOpen: (o: boolean) => void
  setGalleryOpen: (o: boolean) => void
  setFindOpen: (o: boolean) => void
  setKeywordsOpen: (o: boolean) => void
  setImageExport: (v: UiState['imageExport']) => void
  /** Layers section of the right pane expanded (remembered per device). */
  layersOpen: boolean
  /** Assets section docked at the bottom of the left pane expanded (remembered per device). */
  assetsOpen: boolean
  setAssetsOpen: (o: boolean) => void
  /** Card data view (table, CSV export, mail merge); null when closed. */
  dataView: 'table' | 'import' | null
  setDataView: (v: 'table' | 'import' | null) => void
  setLeftTab: (t: PanelId) => void
  setLeftOpen: (o: boolean) => void
  setRightOpen: (o: boolean) => void
  setPhoneSheet: (s: UiState['phoneSheet']) => void
  setLayersOpen: (o: boolean) => void
}

const LAYERS_KEY = 'cardmaker.layersOpen'
const ASSETS_KEY = 'cardmaker.assetsOpen'
function readOpen(key: string) {
  try {
    return localStorage.getItem(key) !== '0'
  } catch {
    return true
  }
}
function writeOpen(key: string, open: boolean) {
  try {
    localStorage.setItem(key, open ? '1' : '0')
  } catch {
    /* storage unavailable */
  }
}

export const useUi = create<UiState>((set) => ({
  leftTab: 'cards',
  leftOpen: false,
  rightOpen: false,
  phoneSheet: null,
  printOpen: false,
  setPrintOpen: (printOpen) => set({ printOpen }),
  imageExport: null,
  keywordsOpen: false,
  findOpen: false,
  galleryOpen: false,
  ttsOpen: false,
  unitsOpen: false,
  vectorOpen: null,
  setVectorOpen: (vectorOpen) => set({ vectorOpen }),
  setUnitsOpen: (unitsOpen) => set({ unitsOpen }),
  setTtsOpen: (ttsOpen) => set({ ttsOpen }),
  setGalleryOpen: (galleryOpen) => set({ galleryOpen }),
  setFindOpen: (findOpen) => set({ findOpen }),
  setKeywordsOpen: (keywordsOpen) => set({ keywordsOpen }),
  setImageExport: (imageExport) => set({ imageExport }),
  layersOpen: readOpen(LAYERS_KEY),
  assetsOpen: readOpen(ASSETS_KEY),
  setAssetsOpen: (assetsOpen) => {
    writeOpen(ASSETS_KEY, assetsOpen)
    set({ assetsOpen })
  },
  dataView: null,
  setDataView: (dataView) => set({ dataView }),
  setLeftTab: (leftTab) => set({ leftTab }),
  setLeftOpen: (leftOpen) => set({ leftOpen }),
  setRightOpen: (rightOpen) => set({ rightOpen }),
  setPhoneSheet: (phoneSheet) => set({ phoneSheet }),
  setLayersOpen: (layersOpen) => {
    writeOpen(LAYERS_KEY, layersOpen)
    set({ layersOpen })
  },
}))
