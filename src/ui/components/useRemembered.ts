import { useState } from 'react'

/** A true/false choice remembered on this device (folded sections, dismissed tips). */
export function useRemembered(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const full = `cardmaker.${key}`
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(full)
      return s === null ? initial : s === '1'
    } catch {
      return initial
    }
  })
  const set = (next: boolean) => {
    setV(next)
    try {
      localStorage.setItem(full, next ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }
  return [v, set]
}
