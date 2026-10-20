/** True inside the Android app (Capacitor injects window.Capacitor before the page runs). */
export const isAndroidApp = () =>
  typeof window !== 'undefined' &&
  (window as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.() ===
    'android'
