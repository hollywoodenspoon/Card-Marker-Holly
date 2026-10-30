import { Highlighter, Images, Layers, LayoutTemplate, Library, SquareStack } from '@/ui/icons'

export type PanelId = 'cards' | 'decks' | 'templates' | 'assets' | 'fonts' | 'keywords' | 'layers'

/**
 * Tabs of the left rail (desktop and tablet): the places where the project's parts
 * live. Assets is docked below the panel instead; views and exports are elsewhere.
 * Fonts live in Settings (☰ → Settings → Fonts) since the one-app merge.
 */
export const LEFT_PANELS: { id: PanelId; label: string; icon: typeof Layers }[] = [
  { id: 'cards', label: 'Cards', icon: SquareStack },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'decks', label: 'Decks', icon: Library },
  { id: 'keywords', label: 'Keywords', icon: Highlighter },
]

export const ASSETS_ICON = Images
