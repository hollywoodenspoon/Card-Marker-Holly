import { undo } from '@/core/editor/editorStore'
import { toast } from '@/ui/components/feedback'

/** Say what was just removed, with an Undo button (deletes act straight away). */
export const deletedToast = (what: string) =>
  toast(`${what} deleted.`, { action: { label: 'Undo', run: undo } })
