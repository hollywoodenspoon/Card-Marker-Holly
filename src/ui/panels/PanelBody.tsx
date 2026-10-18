import type { PanelId } from './panelIds'

export function PanelBody({ id }: { id: PanelId }) {
  return (
    <div className="p-4 text-sm text-muted-foreground">
      <h2 className="mb-2 text-sm font-semibold text-foreground capitalize">{id}</h2>
      Coming soon.
    </div>
  )
}
