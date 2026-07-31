import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import type { InventoryItem, StorageEntry } from '../types'

const BATCH_SIZE = 400

export interface BatchMoveResult {
  movedCount: number
}

/**
 * Merges all of an item's storage entries at `sourceLocationId` into one entry at the target
 * location/sub-location — bins are location-specific, so they're cleared on move (along with any
 * pack size, since that's tied to a physical bin that no longer applies).
 */
function moveItemEntries(
  entries: StorageEntry[],
  sourceLocationId: string,
  targetLocationId: string,
  targetSubLocationId: string | null,
): StorageEntry[] {
  const atSource = entries.filter((e) => e.locationId === sourceLocationId)
  if (atSource.length === 0) return entries
  const elsewhere = entries.filter((e) => e.locationId !== sourceLocationId)
  const movedQuantity = atSource.reduce((sum, e) => sum + e.quantity, 0)
  return [
    ...elsewhere,
    {
      id: crypto.randomUUID(),
      locationId: targetLocationId,
      subLocationId: targetSubLocationId,
      bin: '',
      quantity: movedQuantity,
      packSize: null,
    },
  ]
}

/** Batch-moves selected items' storage entries out of one location into another, in one write pass. */
export async function runBatchMove(
  items: InventoryItem[],
  itemIds: string[],
  sourceLocationId: string,
  targetLocationId: string,
  targetSubLocationId: string | null,
): Promise<BatchMoveResult> {
  const selected = items.filter((i) => itemIds.includes(i.id))
  const writes: { id: string; storageEntries: StorageEntry[] }[] = []

  for (const item of selected) {
    const entries = item.storageEntries ?? []
    if (!entries.some((e) => e.locationId === sourceLocationId)) continue
    writes.push({ id: item.id, storageEntries: moveItemEntries(entries, sourceLocationId, targetLocationId, targetSubLocationId) })
  }

  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    for (const w of chunk) {
      batch.update(doc(db, 'inventoryItems', w.id), { storageEntries: w.storageEntries, updatedAt: serverTimestamp() })
    }
    await batch.commit()
  }

  return { movedCount: writes.length }
}
