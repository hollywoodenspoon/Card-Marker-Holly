/**
 * Saved games for the player: three slots and an autosave per game, in the
 * Engine DB's `saves` table (v4).
 */
import type { Snapshot } from '../runtime/snapshot'
import { db } from './db'

export type SaveSlot = 'auto' | '1' | '2' | '3'
export const SLOTS: SaveSlot[] = ['auto', '1', '2', '3']

export interface SaveRow {
  /** `${gameId}:${slot}` */
  id: string
  gameId: string
  slot: SaveSlot
  savedAt: number
  /** Shown in the slot: the scene's name and the date. */
  label: string
  snapshot: Snapshot
}

export const saveId = (gameId: string, slot: SaveSlot) => `${gameId}:${slot}`

export async function writeSave(row: Omit<SaveRow, 'id'>): Promise<void> {
  await db.saves.put({ ...row, id: saveId(row.gameId, row.slot) })
}

export async function listSaves(gameId: string): Promise<SaveRow[]> {
  return db.saves.where('gameId').equals(gameId).toArray()
}

export const readSave = (gameId: string, slot: SaveSlot) => db.saves.get(saveId(gameId, slot))

export const deleteSave = (gameId: string, slot: SaveSlot) => db.saves.delete(saveId(gameId, slot))
