import { db } from './db';
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r]));
export async function listProjects(d = db) {
    return (await d.projects.toArray()).sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function saveNewProject(b, d = db) {
    await d.transaction('rw', [d.projects, d.templates, d.cards], async () => {
        await d.projects.put(b.project);
        await d.templates.bulkPut(b.templates);
        await d.cards.bulkPut(b.cards);
    });
}
export async function loadProject(id, d = db) {
    const project = await d.projects.get(id);
    if (!project)
        return null;
    const [templates, cards, assets, fonts] = await Promise.all([
        d.templates.where('projectId').equals(id).toArray(),
        d.cards.where('projectId').equals(id).toArray(),
        d.assets.where('projectId').equals(id).toArray(),
        d.fonts.where('projectId').equals(id).toArray(),
    ]);
    return {
        doc: { project, templates: byId(templates), cards: byId(cards) },
        library: { assets: byId(assets), fonts: byId(fonts) },
    };
}
export async function deleteProject(id, d = db) {
    await d.transaction('rw', [d.projects, d.templates, d.cards, d.assets, d.fonts, d.stylePresets], async () => {
        await d.projects.delete(id);
        for (const t of [d.templates, d.cards, d.assets, d.fonts, d.stylePresets])
            await t.where('projectId').equals(id).delete();
    });
}
export async function renameProject(id, name, d = db) {
    await d.projects.update(id, { name, updatedAt: Date.now() });
}
export async function getSetting(key, d = db) {
    return (await d.settings.get(key))?.value;
}
export async function setSetting(key, value, d = db) {
    await d.settings.put({ key, value });
}
