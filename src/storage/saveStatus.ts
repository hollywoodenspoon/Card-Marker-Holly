import { create } from 'zustand'

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error'

export const useSaveStatus = create<{ status: SaveStatus; error?: string }>(() => ({
  status: 'saved',
}))
