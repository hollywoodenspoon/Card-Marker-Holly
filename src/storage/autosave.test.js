import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { closeDoc, commit, openDoc, useEditor } from '@/core/editor/editorStore';
import { createProject } from '@/core/model/factories';
import { startAutosave } from './autosave';
import { CardMakerDB } from './db';
import { loadProject, saveNewProject } from './repo';
let n = 0;
afterEach(() => closeDoc());
describe('autosave', () => {
    it('writes only changed rows and round-trips a project', async () => {
        const database = new CardMakerDB(`test-${n++}`);
        const bundle = createProject('Round trip');
        await saveNewProject(bundle, database);
        const loaded = await loadProject(bundle.project.id, database);
        expect(loaded).not.toBeNull();
        openDoc(loaded.doc, loaded.library);
        const saver = startAutosave(useEditor, { delayMs: 10, database });
        const cardId = bundle.cards[0].id;
        commit((d) => {
            d.cards[cardId].name = 'Renamed';
            d.project.name = 'New name';
        });
        await saver.flush();
        saver.stop();
        const again = await loadProject(bundle.project.id, database);
        expect(again.doc.cards[cardId].name).toBe('Renamed');
        expect(again.doc.project.name).toBe('New name');
        expect(Object.keys(again.doc.templates)).toHaveLength(2);
    });
    it('deletes rows removed from the document', async () => {
        const database = new CardMakerDB(`test-${n++}`);
        const bundle = createProject();
        await saveNewProject(bundle, database);
        const loaded = await loadProject(bundle.project.id, database);
        openDoc(loaded.doc, loaded.library);
        const saver = startAutosave(useEditor, { delayMs: 10, database });
        commit((d) => {
            delete d.cards[bundle.cards[0].id];
        });
        await saver.flush();
        saver.stop();
        expect(await database.cards.count()).toBe(0);
    });
});
