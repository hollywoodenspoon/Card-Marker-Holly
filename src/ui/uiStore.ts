import { create } from 'zustand'
import type { PanelId } from './panels/panelIds'

/** Shell-only UI state: which panel/drawer/sheet is open. Not persisted with the project. */
interface UiState {
  leftTab: PanelId
  leftOpen: boolean // tablet drawer
  rightOpen: boolean // tablet drawer
  phoneSheet: PanelId | 'properties' | 'add' | null
  setLeftTab: (t: PanelId) => void
  setLeftOpen: (o: boolean) => void
  setRightOpen: (o: boolean) => void
  setPhoneSheet: (s: UiState['phoneSheet']) => void
}

export const useUi = create<UiState>((set) => ({
  leftTab: 'cards',
  leftOpen: false,
  rightOpen: false,
  phoneSheet: null,
  setLeftTab: (leftTab) => set({ leftTab }),
  setLeftOpen: (leftOpen) => set({ leftOpen }),
  setRightOpen: (rightOpen) => set({ rightOpen }),
  setPhoneSheet: (phoneSheet) => set({ phoneSheet }),
}))
