/** Save a blob as a file (works on desktop and mobile browsers). */
export function downloadBlob(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export const safeFileName = (s: string, fallback = 'cards') =>
  s.replace(/[^\w\- ]+/g, '').trim() || fallback
