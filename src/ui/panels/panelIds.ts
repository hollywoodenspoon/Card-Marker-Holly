import { Images, Layers, LayoutTemplate, SquareStack, Type } from 'lucide-react'

export type PanelId = 'cards' | 'templates' | 'assets' | 'fonts' | 'layers'

export const LEFT_PANELS: { id: PanelId; label: string; icon: typeof Layers }[] = [
  { id: 'cards', label: 'Cards', icon: SquareStack },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'assets', label: 'Assets', icon: Images },
  { id: 'fonts', label: 'Fonts', icon: Type },
  { id: 'layers', label: 'Layers', icon: Layers },
]
