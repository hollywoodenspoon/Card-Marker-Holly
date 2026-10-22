import { forwardRef } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { GAME_ICONS } from './gameIcons.gen'

/**
 * Every icon in the app comes from here. Small utility glyphs (close, chevrons,
 * checks, alignment…) are lucide's; the main buttons are fantasy silhouettes
 * from game-icons.net (CC BY 3.0), mapped in scripts/game-icons.mjs. They keep
 * lucide's names and props, so swapping a picture never touches the call sites.
 */
// eslint-disable-next-line react-refresh/only-export-components -- re-exports lucide's icon components
export * from 'lucide-react'

function gameIcon(name: keyof typeof GAME_ICONS): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function GameIcon(
    // lucide's stroke props don't apply to filled silhouettes.
    {
      size = 24,
      color = 'currentColor',
      strokeWidth: _s,
      absoluteStrokeWidth: _a,
      className,
      ...rest
    },
    ref,
  ) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 512 512"
        fill={color}
        aria-hidden={rest['aria-label'] ? undefined : true}
        className={className ? `game-icon ${className}` : 'game-icon'}
        {...rest}
        dangerouslySetInnerHTML={{ __html: GAME_ICONS[name] }}
      />
    )
  })
  Icon.displayName = name
  return Icon as unknown as LucideIcon
}

export const LayoutTemplate = gameIcon('LayoutTemplate')
export const SquareStack = gameIcon('SquareStack')
export const Library = gameIcon('Library')
export const Type = gameIcon('Type')
export const Printer = gameIcon('Printer')
export const LayoutGrid = gameIcon('LayoutGrid')
export const Swords = gameIcon('Swords')
export const ImageDown = gameIcon('ImageDown')
export const Highlighter = gameIcon('Highlighter')
export const PenTool = gameIcon('PenTool')
export const Sheet = gameIcon('Sheet')
export const Menu = gameIcon('Menu')
export const Settings2 = gameIcon('Settings2')
export const Undo2 = gameIcon('Undo2')
export const Redo2 = gameIcon('Redo2')
export const Home = gameIcon('Home')
export const Download = gameIcon('Download')
export const TextSearch = gameIcon('TextSearch')
export const Ruler = gameIcon('Ruler')
export const Layers = gameIcon('Layers')
export const Wand2 = gameIcon('Wand2')
export const Paintbrush = gameIcon('Paintbrush')
export const Dices = gameIcon('Dices')
export const Coins = gameIcon('Coins')
export const Trophy = gameIcon('Trophy')
export const Flag = gameIcon('Flag')
export const Shuffle = gameIcon('Shuffle')
export const ScrollText = gameIcon('ScrollText')
