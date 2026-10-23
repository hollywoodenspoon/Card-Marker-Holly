import { useEffect, useState } from 'react'
import { create } from 'zustand'
import {
  builtinProfile,
  customProfile,
  CUSTOM_PROFILE_KEY,
  readCustomProfile,
  type CustomProfile,
  type LoadedProfile,
} from '@/print/color/profiles'
import type { FullPrintSettings } from '@/print/settings'
import { getBackend } from '@/storage'

/** The print shop's own profile, kept on this device (undefined: not read yet). */
export const useCustomProfile = create<{ custom: CustomProfile | null | undefined }>(() => ({
  custom: undefined,
}))

let reading: Promise<void> | null = null
function readStored() {
  reading ??= getBackend()
    .getSetting<CustomProfile | null>(CUSTOM_PROFILE_KEY)
    .then((custom) => useCustomProfile.setState({ custom: custom ?? null }))
    .catch(() => useCustomProfile.setState({ custom: null }))
  return reading
}

/** Load a print shop's .icc file (checked first) and keep it on this device. */
export async function setCustomProfile(file: File) {
  const custom = await readCustomProfile(file)
  await getBackend().setSetting(CUSTOM_PROFILE_KEY, custom)
  useCustomProfile.setState({ custom })
  return custom
}

export async function clearCustomProfile() {
  await getBackend().setSetting(CUSTOM_PROFILE_KEY, null)
  useCustomProfile.setState({ custom: null })
}

export interface ActiveProfile {
  profile: LoadedProfile | null
  /** The settings ask for the print shop's profile, but this device has none. */
  missingCustom: boolean
  error: string | null
}

/** The printer profile the CMYK settings use, loaded when CMYK is on. */
export function useActiveProfile(p: FullPrintSettings): ActiveProfile {
  const custom = useCustomProfile((s) => s.custom)
  const cmyk = p.colorMode === 'cmyk'
  const wantCustom = p.cmykProfile === 'custom'
  const [state, setState] = useState<{
    key: string
    profile: LoadedProfile | null
    error: string | null
  }>({ key: '', profile: null, error: null })
  useEffect(() => {
    if (cmyk && custom === undefined) void readStored()
  }, [cmyk, custom])
  const useCustom = wantCustom && !!custom
  const key = !cmyk
    ? ''
    : useCustom
      ? `custom:${custom!.fileName}:${custom!.data.length}`
      : 'builtin'
  useEffect(() => {
    if (!key || (wantCustom && custom === undefined)) return
    let live = true
    const load = useCustom ? customProfile(custom!) : builtinProfile()
    load.then(
      (profile) => live && setState({ key, profile, error: null }),
      (e: unknown) =>
        live && setState({ key, profile: null, error: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      live = false
    }
  }, [key, useCustom, custom, wantCustom])
  const current = state.key === key
  return {
    profile: cmyk && current ? state.profile : null,
    missingCustom: cmyk && wantCustom && custom === null,
    error: cmyk && current ? state.error : null,
  }
}
