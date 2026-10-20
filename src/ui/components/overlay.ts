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

const backHandlers: (() => void)[] = []

/**
 * Android's Back button: the innermost open view that registered here handles it
 * (views that don't close on Escape, like the Vector Maker). Others get an Escape.
 */
export function useBackHandler(onBack: () => void) {
  const fn = useRef(onBack)
  useEffect(() => {
    fn.current = onBack
  })
  useEffect(() => {
    const h = () => fn.current()
    backHandlers.push(h)
    return () => {
      backHandlers.splice(backHandlers.indexOf(h), 1)
    }
  }, [])
}

export const topBackHandler = (): (() => void) | undefined => backHandlers.at(-1)

/** Send Escape to whatever has focus (dialogs, sheets and full-screen views close on it). */
export function sendEscape() {
  const target = document.activeElement ?? document.body
  target.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  )
}
