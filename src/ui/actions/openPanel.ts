import type { PanelId } from '@/ui/panels/panelIds'
import { currentLayout } from '@/ui/shell/useLayout'
import { useUi } from '@/ui/uiStore'

/** Show a left-pane tab: the bottom sheet on phones, the drawer on tablets. */
export function openPanel(id: PanelId) {
  const ui = useUi.getState()
  const layout = currentLayout()
  if (layout === 'phone') return ui.setPhoneSheet(id)
  ui.setLeftTab(id)
  if (layout === 'tablet') ui.setLeftOpen(true)
}
