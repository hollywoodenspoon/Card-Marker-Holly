/** Is a finger the main pointer (phone, tablet)? Hints then say "tap", otherwise "click". */
export const touchFirst = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

/** "click" or "tap", for hints. */
export const clickWord = () => (touchFirst() ? 'tap' : 'click')
