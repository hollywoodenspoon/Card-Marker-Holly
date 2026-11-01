/**
 * Saved games for the player: the game's number of slots and autosave slots, in the
 * Engine DB's `saves` table (v4).
 */
import type { Snapshot } from '../runtime/snapshot'
import { db } from './db'

/** "auto", "auto2"… (autosaves) and "1", "2"… (the player's); how many is the game's setting. */
export type SaveSlot = string

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
