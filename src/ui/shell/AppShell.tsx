import { DesktopShell } from './DesktopShell'
import { PhoneShell } from './PhoneShell'
import { TabletShell } from './TabletShell'
import { useLayout } from './useLayout'

export function AppShell() {
  const layout = useLayout()
  if (layout === 'phone') return <PhoneShell />
  if (layout === 'tablet') return <TabletShell />
  return <DesktopShell />
}
