import { createContext, useContext } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { DEFAULT_UNITS, type UnitSettings } from '@/core/units/units'

/** Overrides the project's units (e.g. in the new-project dialog, before a project exists). */
export const UnitsContext = createContext<UnitSettings | null>(null)

/** The units lengths are shown in: the context override, else the open project's setting. */
export function useUnits(): UnitSettings {
  const override = useContext(UnitsContext)
  const project = useEditor((s) => s.doc?.project.units)
  return override ?? project ?? DEFAULT_UNITS
}

const KEY = 'cardmaker.defaultUnits'

/** Units new projects start with (the last choice on this device). */
export function readDefaultUnits(): UnitSettings {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as UnitSettings | null
    if (v && ['mm', 'cm', 'in', 'px'].includes(v.unit) && v.ppi > 0) return v
  } catch {
    /* storage unavailable */
  }
  return DEFAULT_UNITS
}

export function writeDefaultUnits(u: UnitSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(u))
  } catch {
    /* storage unavailable */
  }
}
