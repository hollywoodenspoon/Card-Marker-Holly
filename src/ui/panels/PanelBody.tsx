import { AssetsPanel } from './AssetsPanel'
import { CardsPanel } from './CardsPanel'
import { DecksPanel } from './DecksPanel'
import { FontsPanel } from './FontsPanel'
import { LayersPanel } from './LayersPanel'
import { TemplatesPanel } from './TemplatesPanel'
import type { PanelId } from './panelIds'

export function PanelBody({ id, onPicked }: { id: PanelId; onPicked?: () => void }) {
  switch (id) {
    case 'cards':
      return <CardsPanel onPicked={onPicked} />
    case 'decks':
      return <DecksPanel />
    case 'assets':
      return <AssetsPanel onPicked={onPicked} />
    case 'fonts':
      return <FontsPanel />
    case 'templates':
      return <TemplatesPanel onPicked={onPicked} />
    case 'layers':
      return <LayersPanel />
  }
}
