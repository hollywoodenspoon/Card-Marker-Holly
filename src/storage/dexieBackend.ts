import type { StorageBackend } from './backend'
import { db, type CardMakerDB } from './db'
import {
  deleteProject,
  getSetting,
  listProjects,
  loadProject,
  renameProject,
  saveProjectBundle,
  setSetting,
} from './repo'

/** Projects stored in this browser (IndexedDB). */
export function dexieBackend(d: CardMakerDB = db): StorageBackend {
  return {
    kind: 'browser',
    async listProjects() {
      return (await listProjects(d)).map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        defaultSize: p.defaultSize,
      }))
    },
    loadProject: (id) => loadProject(id, d),
    saveBundle: (b) => saveProjectBundle(b, d),
    replaceBundle: (b) =>
      d.transaction(
        'rw',
        [d.projects, d.templates, d.cards, d.assets, d.fonts, d.stylePresets],
        async () => {
          await deleteProject(b.project.id, d)
          await saveProjectBundle(b, d)
        },
      ),
    async writeChanges({ doc }, ch) {
      const { templates: t, cards: c, stylePresets: sp, assets: a, fonts: f } = ch
      await d.transaction(
        'rw',
        [d.projects, d.templates, d.cards, d.assets, d.fonts, d.stylePresets],
        async () => {
          if (ch.projectChanged) await d.projects.put({ ...doc.project, updatedAt: Date.now() })
          if (t.put.length) await d.templates.bulkPut(t.put)
          if (t.del.length) await d.templates.bulkDelete(t.del)
          if (c.put.length) await d.cards.bulkPut(c.put)
          if (c.del.length) await d.cards.bulkDelete(c.del)
          if (sp.put.length) await d.stylePresets.bulkPut(sp.put)
          if (sp.del.length) await d.stylePresets.bulkDelete(sp.del)
          if (a.put.length) await d.assets.bulkPut(a.put)
          if (a.del.length) await d.assets.bulkDelete(a.del)
          if (f.put.length) await d.fonts.bulkPut(f.put)
          if (f.del.length) await d.fonts.bulkDelete(f.del)
        },
      )
    },
    deleteProject: (id) => deleteProject(id, d),
    renameProject: (id, name) => renameProject(id, name, d),
    getSetting: (key) => getSetting(key, d),
    setSetting: (key, value) => setSetting(key, value, d),
  }
}
