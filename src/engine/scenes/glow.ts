import type { Glow } from '../model/game'

/** Whether an area's glow shows, from its setting and what the pointer is doing. */
export function glowOn(g: Glow, hovered: boolean, pressed: boolean, touch: boolean) {
  if (g.what === 'none') return false
  // Touch screens have no hover: the glow shows while pressed instead.
  if (touch) return pressed
  return (g.when !== 'click' && hovered) || (g.when !== 'hover' && pressed)
}
