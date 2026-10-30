import { create } from 'zustand'

export type SettingsSection = 'appearance' | 'fonts' | 'about'

/** Which Settings tab is open (null when closed); opened from ☰ → Settings… in every workspace. */
export const useSettingsDialog = create<{ open: SettingsSection | null }>(() => ({ open: null }))
export const openSettings = (section: SettingsSection = 'appearance') =>
  useSettingsDialog.setState({ open: section })
