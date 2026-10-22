import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { closeDoc, commit, openDoc, useEditor } from '@/core/editor/editorStore'
import { createProject } from '@/core/model/factories'
import { startAutosave } from './autosave'
import { CardMakerDB } from './db'
import { dexieBackend } from './dexieBackend'
import { loadProject, saveNewProject } from './repo'

let n = 0
afterEach(() => closeDoc())

describe('autosave', () => {
  it('writes only changed rows and round-trips a project', async () => {
    const database = new CardMakerDB(`test-${n++}`)
    const bundle = createProject('Round trip')
    await saveNewProject(bundle, database)
    const loaded = await loadProject(bundle.project.id, database)
    expect(loaded).not.toBeNull()
    openDoc(loaded!.doc, loaded!.library)

    const saver = startAutosave(useEditor, { delayMs: 10, backend: dexieBackend(database) })
    const cardId = bundle.cards[0].id
    commit((d) => {
      d.cards[cardId].name = 'Renamed'
      d.project.name = 'New name'
    })
    await saver.flush()
    saver.stop()

    const again = await loadProject(bundle.project.id, database)
    expect(again!.doc.cards[cardId].name).toBe('Renamed')
    expect(again!.doc.project.name).toBe('New name')
    expect(Object.keys(again!.doc.templates)).toHaveLength(2)
  })

  it('deletes rows removed from the document', async () => {
    const database = new CardMakerDB(`test-${n++}`)
    const bundle = createProject()
    await saveNewProject(bundle, database)
    const loaded = await loadProject(bundle.project.id, database)
    openDoc(loaded!.doc, loaded!.library)
    const saver = startAutosave(useEditor, { delayMs: 10, backend: dexieBackend(database) })
    commit((d) => {
      delete d.cards[bundle.cards[0].id]
    })
    await saver.flush()
    saver.stop()
    expect(await database.cards.count()).toBe(0)
  })

  it('retries a failed write with the next save, so nothing is lost', async () => {
    const database = new CardMakerDB(`test-${n++}`)
    const bundle = createProject()
    await saveNewProject(bundle, database)
    const loaded = await loadProject(bundle.project.id, database)
    openDoc(loaded!.doc, loaded!.library)
    const real = dexieBackend(database)
    let fail = true
    const flaky: typeof real = {
      ...real,
      writeChanges: async (state, changes) => {
        if (fail) throw new Error('QuotaExceededError')
        return real.writeChanges(state, changes)
      },
    }
    const saver = startAutosave(useEditor, { delayMs: 10, backend: flaky })
    const [a, b] = [bundle.cards[0].id, bundle.templates[0].id]
    commit((d) => void (d.cards[a].name = 'First edit'))
    await saver.flush()
    fail = false
    // A later, unrelated edit: the save must still carry the first one.
    commit((d) => void (d.templates[b].name = 'Second edit'))
    await saver.flush()
    saver.stop()
    const again = await loadProject(bundle.project.id, database)
    expect(again!.doc.cards[a].name).toBe('First edit')
    expect(again!.doc.templates[b].name).toBe('Second edit')
  })
})
