import Dexie, {} from 'dexie';
export class CardMakerDB extends Dexie {
    projects;
    templates;
    cards;
    assets;
    fonts;
    stylePresets;
    settings;
    constructor(name = 'card-maker') {
        super(name);
        this.version(1).stores({
            projects: 'id, name, updatedAt',
            templates: 'id, projectId, side, updatedAt',
            cards: 'id, projectId, [projectId+order], frontTemplateId, backTemplateId',
            assets: 'id, projectId, *tags',
            fonts: 'id, projectId, family',
            stylePresets: 'id, projectId',
            settings: 'key',
        });
    }
}
export const db = new CardMakerDB();
