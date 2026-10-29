import { create } from 'zustand'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

/** The engine's own save indicator state (separate from the card app's). */
export const useEngineSaveStatus = create<{ status: SaveStatus; error?: string }>(() => ({
  status: 'saved',
}))
