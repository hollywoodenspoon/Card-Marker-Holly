/** First-run checklist state, per device. */
const DONE = 'cardmaker.firstRunDone'
const PRINTED = 'cardmaker.printOpened'

const read = (k: string) => {
  try {
    return localStorage.getItem(k) === '1'
  } catch {
    return false
  }
}
const write = (k: string) => {
  try {
    localStorage.setItem(k, '1')
  } catch {
    /* storage unavailable */
  }
}

export const firstRunDone = () => read(DONE)
export const setFirstRunDone = () => write(DONE)
export const printWasOpened = () => read(PRINTED)
export const notePrintOpened = () => write(PRINTED)
