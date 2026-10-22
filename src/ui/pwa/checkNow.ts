import { APP_BUILD } from '@/app/appInfo'
import { toast } from '@/ui/components/feedback'
import { checkForUpdates } from './pwa'

const SAID = {
  update: 'A new version is ready: press Update.',
  latest: `You have the latest version (${APP_BUILD}).`,
  offline: "Couldn't reach the site to check. Try again when you're online.",
  none: 'This copy updates with the app itself.',
}

/** Look for a new version now (the Update message then offers it). */
export async function checkNow() {
  toast(SAID[await checkForUpdates()])
}
