import { flatten } from './tree'
import type { Card, Template } from './types'

/** Ids of assets referenced anywhere in the project. */
export function usedAssetIds(doc: {
  templates: Record<string, Template>
  cards: Record<string, Card>
}): Set<string> {
  const ids = new Set<string>()
  const els = [
    ...Object.values(doc.templates).flatMap((t) => flatten(t.elements)),
    ...Object.values(doc.cards).flatMap((c) => flatten([...c.local.front, ...c.local.back])),
  ]
  for (const e of els) {
    if (e.type === 'image') ids.add(e.assetId)
    if (e.type === 'imageField' && e.defaultAssetId) ids.add(e.defaultAssetId)
    if (e.type === 'iconRow' && e.assetId) ids.add(e.assetId)
  }
  for (const c of Object.values(doc.cards))
    for (const v of Object.values(c.fields)) if (v.kind === 'image' && v.assetId) ids.add(v.assetId)
  return ids
}
