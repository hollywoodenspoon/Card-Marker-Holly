/** The dialogue box's typing, so keys can show the rest of the text at once. */
let finishTyping: (() => boolean) | null = null

export function setFinishTyping(fn: (() => boolean) | null) {
  finishTyping = fn
}

/** Shows the rest of the typing text at once. True if it was still typing. */
export function skipTyping(): boolean {
  return finishTyping?.() ?? false
}
