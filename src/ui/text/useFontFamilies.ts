import { useMemo } from 'react'
import { useEditor } from '@/core/editor/editorStore'
import { BUILTIN_FONTS } from '@/assets/fonts'

/** Uploaded font families first, then the bundled and system ones. */
export function useFontFamilies() {
  const fonts = useEditor((s) => s.library.fonts)
  return useMemo(
    () => [...new Set([...Object.values(fonts).map((f) => f.family), ...BUILTIN_FONTS])],
    [fonts],
  )
}
