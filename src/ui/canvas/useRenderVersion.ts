import { useSyncExternalStore } from 'react'
import { assetResolver } from '@/assets/assetResolver'
import { fontsVersion, onFontsChanged } from '@/assets/fonts'

const subscribe = (fn: () => void) => {
  const a = assetResolver.subscribe(fn)
  const f = onFontsChanged(fn)
  return () => {
    a()
    f()
  }
}
const snapshot = () => assetResolver.version * 100000 + fontsVersion()

/**
 * A number that changes whenever images finish decoding, the asset list changes
 * or fonts load (the resolver is kept up to date once, in main.tsx).
 */
export function useRenderVersion() {
  return useSyncExternalStore(subscribe, snapshot)
}
