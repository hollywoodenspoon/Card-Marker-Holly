import { desktop } from '@/platform/desktop'
import { toast } from '@/ui/components/feedback'

/** Save a blob as a file: a "Save as" dialog in the desktop app, a download in browsers. */
export function downloadBlob(blob: Blob, name: string) {
  const bridge = desktop()
  if (bridge) return void saveWithDialog(bridge, blob, name)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

async function saveWithDialog(
  bridge: NonNullable<ReturnType<typeof desktop>>,
  blob: Blob,
  name: string,
) {
  try {
    const path = await bridge.saveFile(name, new Uint8Array(await blob.arrayBuffer()))
    if (path)
      toast(`Saved ${path.split(/[\\/]/).pop()}`, {
        action:
          bridge.canReveal === false
            ? undefined
            : { label: 'Show in folder', run: () => void bridge.reveal(path) },
      })
  } catch (e) {
    toast(`Could not save the file: ${e instanceof Error ? e.message : String(e)}`, {
      tone: 'error',
    })
  }
}

export const safeFileName = (s: string, fallback = 'cards') =>
  s.replace(/[^\w\- ]+/g, '').trim() || fallback
