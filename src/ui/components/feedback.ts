import { create } from 'zustand'

/**
 * In-app replacements for the browser's prompt / confirm / alert, plus short
 * messages ("toasts") that can offer an action such as Undo. Call the
 * functions from anywhere; <FeedbackHost /> (FeedbackHost.tsx, mounted once in App) shows them.
 */

export interface TextAsk {
  kind: 'text'
  title: string
  label?: string
  description?: string
  initial: string
  okLabel?: string
  /** An empty answer is '' (e.g. "remove") instead of a cancel. */
  allowEmpty?: boolean
  resolve: (v: string | null) => void
}
export interface ConfirmAsk {
  kind: 'confirm'
  title: string
  description?: string
  okLabel?: string
  cancelLabel?: string
  danger?: boolean
  resolve: (v: boolean) => void
}
export interface ChoiceAsk {
  kind: 'choice'
  title: string
  description?: string
  /** Buttons, last one first in reading order on wide screens; Cancel is added. */
  choices: { id: string; label: string; danger?: boolean; primary?: boolean }[]
  resolve: (v: string | null) => void
}
export interface Toast {
  id: number
  message: string
  tone?: 'error'
  action?: { label: string; run: () => void }
}

export const useFeedback = create<{
  ask: TextAsk | ConfirmAsk | ChoiceAsk | null
  toasts: Toast[]
}>(() => ({
  ask: null,
  toasts: [],
}))

/** Ask for a line of text. Resolves to the trimmed text, or null when cancelled (or empty, unless allowEmpty). */
export function askText(
  opts: Omit<TextAsk, 'kind' | 'resolve' | 'initial'> & { initial?: string },
) {
  return new Promise<string | null>((resolve) =>
    useFeedback.setState({ ask: { kind: 'text', initial: '', ...opts, resolve } }),
  )
}

/** Ask to confirm. Resolves true when confirmed. */
export function askConfirm(opts: Omit<ConfirmAsk, 'kind' | 'resolve'>) {
  return new Promise<boolean>((resolve) =>
    useFeedback.setState({ ask: { kind: 'confirm', ...opts, resolve } }),
  )
}

/** Ask to pick one of several actions. Resolves to the choice's id, or null when cancelled. */
export function askChoice(opts: Omit<ChoiceAsk, 'kind' | 'resolve'>) {
  return new Promise<string | null>((resolve) =>
    useFeedback.setState({ ask: { kind: 'choice', ...opts, resolve } }),
  )
}

let nextToast = 1
/** A short message at the bottom of the screen (5 s), optionally with an action. */
export function toast(message: string, opts: Omit<Toast, 'id' | 'message'> = {}) {
  const id = nextToast++
  // The same message again replaces the old one instead of stacking.
  useFeedback.setState((s) => ({
    toasts: [...s.toasts.filter((t) => t.message !== message).slice(-2), { id, message, ...opts }],
  }))
  setTimeout(() => dismiss(id), opts.action ? 6000 : 4000)
}
export const dismiss = (id: number) =>
  useFeedback.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
