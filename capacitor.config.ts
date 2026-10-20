import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The Android app: the same web build (built with VITE_TARGET=android) inside a
 * WebView. appId stays fixed when the app's working title changes.
 */
const config: CapacitorConfig = {
  appId: 'io.github.hollywoodenspoon.cardmaker',
  appName: 'Card Maker',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { allowMixedContent: false },
}

export default config
