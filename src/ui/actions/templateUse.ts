import type { Id, Side } from '@/core/model/types'
import { setTemplateForCards } from '@/templates/bulkCommands'
import { applyBackToAll, applyTemplate } from '@/templates/commands'
import { toast } from '@/ui/components/feedback'

/** Template switches from the UI, with a note when a back didn't fit the front's size. */

const keptBack = (n: number) =>
  n &&
  toast(
    `${n} card${n === 1 ? '' : 's'} kept ${n === 1 ? 'its' : 'their'} back: the back is a different size from the front.`,
  )

export function pickTemplateForCard(templateId: Id, cardId?: Id) {
  const r = applyTemplate(templateId, cardId)
  if (r === 'size')
    toast("That back is a different size from this card's front.", { tone: 'error' })
  return r
}

export const pickBackForAllCards = (templateId: Id) => keptBack(applyBackToAll(templateId))

export const templateForCards = (ids: Id[], side: Side, templateId: Id | null) =>
  keptBack(setTemplateForCards(ids, side, templateId))
