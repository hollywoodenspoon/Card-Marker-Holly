import { Images, Layers, LayoutTemplate, Library, SquareStack, Type } from 'lucide-react'

export type PanelId = 'cards' | 'decks' | 'templates' | 'assets' | 'fonts' | 'layers'

/** Tabs of the left rail (desktop and tablet). Assets is docked below the panel instead. */
export const LEFT_PANELS: { id: PanelId; label: string; icon: typeof Layers }[] = [
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'cards', label: 'Cards', icon: SquareStack },
  { id: 'decks', label: 'Decks', icon: Library },
  { id: 'fonts', label: 'Fonts', icon: Type },
]

export const ASSETS_ICON = Images
