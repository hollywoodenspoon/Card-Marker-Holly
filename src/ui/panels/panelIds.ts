import { Images, Layers, LayoutTemplate, Library, SquareStack, Type } from 'lucide-react'

export type PanelId = 'cards' | 'decks' | 'templates' | 'assets' | 'fonts' | 'layers'

export const LEFT_PANELS: { id: PanelId; label: string; icon: typeof Layers }[] = [
  { id: 'cards', label: 'Cards', icon: SquareStack },
  { id: 'decks', label: 'Decks', icon: Library },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'assets', label: 'Assets', icon: Images },
  { id: 'fonts', label: 'Fonts', icon: Type },
]
