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
  setFindOpen: (o: boolean) => void
  setKeywordsOpen: (o: boolean) => void
  setImageExport: (v: UiState['imageExport']) => void
  /** Layers section of the right pane expanded (remembered per device). */
  layersOpen: boolean
  setLeftTab: (t: PanelId) => void
  setLeftOpen: (o: boolean) => void
  setRightOpen: (o: boolean) => void
  setPhoneSheet: (s: UiState['phoneSheet']) => void
  setLayersOpen: (o: boolean) => void
}

const LAYERS_KEY = 'cardmaker.layersOpen'
function readLayersOpen() {
  try {
    return localStorage.getItem(LAYERS_KEY) !== '0'
  } catch {
    return true
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
  setFindOpen: (findOpen) => set({ findOpen }),
  setKeywordsOpen: (keywordsOpen) => set({ keywordsOpen }),
  setImageExport: (imageExport) => set({ imageExport }),
  layersOpen: readLayersOpen(),
  setLeftTab: (leftTab) => set({ leftTab }),
  setLeftOpen: (leftOpen) => set({ leftOpen }),
  setRightOpen: (rightOpen) => set({ rightOpen }),
  setPhoneSheet: (phoneSheet) => set({ phoneSheet }),
  setLayersOpen: (layersOpen) => {
    try {
      localStorage.setItem(LAYERS_KEY, layersOpen ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
    set({ layersOpen })
  },
}))
