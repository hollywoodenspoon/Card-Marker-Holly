import { useEffect, useRef } from 'react'

/**
 * Is a dialog, sheet, popover or full-screen view open? They all carry
 * role="dialog" (Radix dialogs and our full-screen views), and the card
 * editor's shortcuts must not act on the hidden canvas behind them.
 */
export const overlayOpen = () =>
  typeof document !== 'undefined' && !!document.querySelector('[role="dialog"]')

const isField = (el: Element | null) =>
  !!el &&
  ((el as HTMLElement).isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

/**
 * Escape closes a full-screen view. Escape in a text box first just leaves
 * the box; a dialog opened on top of the view handles Escape itself.
 */
export function useEscapeToClose(close: () => void) {
  const fn = useRef(close)
  useEffect(() => {
    fn.current = close
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="dialog"][data-state="open"]')) return
      if (isField(document.activeElement)) {
        ;(document.activeElement as HTMLElement).blur()
        return
      }
      e.preventDefault()
      fn.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
