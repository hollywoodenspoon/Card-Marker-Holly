import { AssetsPanel } from './AssetsPanel'
import { CardsPanel } from './CardsPanel'
import { FontsPanel } from './FontsPanel'
import { LayersPanel } from './LayersPanel'
import type { PanelId } from './panelIds'

export function PanelBody({ id, onPicked }: { id: PanelId; onPicked?: () => void }) {
  switch (id) {
    case 'cards':
      return <CardsPanel onPicked={onPicked} />
    case 'assets':
      return <AssetsPanel onPicked={onPicked} />
    case 'fonts':
      return <FontsPanel />
    case 'layers':
      return <LayersPanel />
    default:
      return (
        <div className="p-4 text-sm text-muted-foreground">
          <h2 className="mb-2 text-sm font-semibold text-foreground capitalize">{id}</h2>
          Coming soon.
        </div>
      )
  }
}
