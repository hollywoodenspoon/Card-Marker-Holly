import type { DocState, LibraryState } from '@/core/editor/editorStore'
import type { NewProjectBundle } from '@/core/model/factories'
import type { Project } from '@/core/model/types'
import { db, type CardMakerDB } from './db'

const byId = <T extends { id: string }>(rows: T[]) =>
  Object.fromEntries(rows.map((r) => [r.id, r])) as Record<string, T>

export async function listProjects(d: CardMakerDB = db): Promise<Project[]> {
  return (await d.projects.toArray()).sort((a, b) => b.updatedAt - a.updatedAt)
}

export async function saveNewProject(b: NewProjectBundle, d: CardMakerDB = db) {
  await d.transaction('rw', [d.projects, d.templates, d.cards], async () => {
    await d.projects.put(b.project)
    await d.templates.bulkPut(b.templates)
    await d.cards.bulkPut(b.cards)
  })
}

export async function loadProject(
  id: string,
  d: CardMakerDB = db,
): Promise<{ doc: DocState; library: LibraryState } | null> {
  const project = await d.projects.get(id)
  if (!project) return null
  const [templates, cards, assets, fonts] = await Promise.all([
    d.templates.where('projectId').equals(id).toArray(),
    d.cards.where('projectId').equals(id).toArray(),
    d.assets.where('projectId').equals(id).toArray(),
    d.fonts.where('projectId').equals(id).toArray(),
  ])
  return {
    doc: { project, templates: byId(templates), cards: byId(cards) },
    library: { assets: byId(assets), fonts: byId(fonts) },
  }
}

export async function deleteProject(id: string, d: CardMakerDB = db) {
  await d.transaction(
    'rw',
    [d.projects, d.templates, d.cards, d.assets, d.fonts, d.stylePresets],
    async () => {
      await d.projects.delete(id)
      for (const t of [d.templates, d.cards, d.assets, d.fonts, d.stylePresets] as const)
        await t.where('projectId').equals(id).delete()
    },
  )
}

export async function renameProject(id: string, name: string, d: CardMakerDB = db) {
  await d.projects.update(id, { name, updatedAt: Date.now() })
}

export async function getSetting<T>(key: string, d: CardMakerDB = db): Promise<T | undefined> {
  return (await d.settings.get(key))?.value as T | undefined
}

export async function setSetting(key: string, value: unknown, d: CardMakerDB = db) {
  await d.settings.put({ key, value })
}
