import Dexie, { type EntityTable } from 'dexie'
import type { Asset, Card, FontAsset, Project, StylePreset, Template } from '@/core/model/types'

export interface SettingRow {
  key: string
  value: unknown
}

export class CardMakerDB extends Dexie {
  projects!: EntityTable<Project, 'id'>
  templates!: EntityTable<Template, 'id'>
  cards!: EntityTable<Card, 'id'>
  assets!: EntityTable<Asset, 'id'>
  fonts!: EntityTable<FontAsset, 'id'>
  stylePresets!: EntityTable<StylePreset, 'id'>
  settings!: EntityTable<SettingRow, 'key'>

  constructor(name = 'card-maker') {
    super(name)
    this.version(1).stores({
      projects: 'id, name, updatedAt',
      templates: 'id, projectId, side, updatedAt',
      cards: 'id, projectId, [projectId+order], frontTemplateId, backTemplateId',
      assets: 'id, projectId, *tags',
      fonts: 'id, projectId, family',
      stylePresets: 'id, projectId',
      settings: 'key',
    })
  }
}

export const db = new CardMakerDB()
