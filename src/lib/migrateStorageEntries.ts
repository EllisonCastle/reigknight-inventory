import { doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { getOrCreateVendorLocation } from './vendorLocation'
import type { InventoryItem, LocationDoc } from '../types'

const BATCH_SIZE = 400
export const UNASSIGNED_LOCATION_NAME = 'Unassigned / Needs Sorting'

export interface LocationMappingChoice {
  mode: 'existing' | 'new'
  locationId?: string
  newName?: string
}

export interface MigrationPreview {
  distinctValues: { value: string; count: number }[]
  vendorCount: number
  blankCount: number
  alreadyMigratedCount: number
}

/** An item still needs migrating if it has no real storage entries yet — the same idempotency guard the app's other one-time migrations use. */
function isUnmigrated(item: InventoryItem): boolean {
  return !item.storageEntries || item.storageEntries.length === 0
}

export function buildMigrationPreview(items: InventoryItem[]): MigrationPreview {
  const pending = items.filter(isUnmigrated)
  const vendorItems = pending.filter((i) => i.vendorId)
  const nonVendor = pending.filter((i) => !i.vendorId)
  const blankItems = nonVendor.filter((i) => !(i.location || '').trim())
  const namedItems = nonVendor.filter((i) => (i.location || '').trim())

  const counts = new Map<string, number>()
  for (const item of namedItems) {
    const value = item.location!.trim()
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return {
    distinctValues: [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value)),
    vendorCount: vendorItems.length,
    blankCount: blankItems.length,
    alreadyMigratedCount: items.length - pending.length,
  }
}

export interface MigrationResult {
  migratedCount: number
  newLocationsCreated: number
}

/**
 * Converts every not-yet-migrated item's dormant location/bin/totalQuantity into one real
 * storageEntry. The old fields are left in place on the document, not stripped — per the
 * explicit call to keep the original data recoverable until a later cleanup pass.
 */
export async function runStorageEntriesMigration(
  items: InventoryItem[],
  locations: LocationDoc[],
  mapping: Record<string, LocationMappingChoice>,
  createLocation: (data: { name: string; type: LocationDoc['type'] }) => Promise<{ id: string }>,
): Promise<MigrationResult> {
  const pending = items.filter(isUnmigrated)
  if (pending.length === 0) return { migratedCount: 0, newLocationsCreated: 0 }

  let newLocationsCreated = 0

  const resolvedIds = new Map<string, string>()
  for (const [value, choice] of Object.entries(mapping)) {
    if (choice.mode === 'existing' && choice.locationId) {
      resolvedIds.set(value, choice.locationId)
    } else {
      const name = (choice.newName ?? value).trim() || value
      const ref = await createLocation({ name, type: 'standard' })
      resolvedIds.set(value, ref.id)
      newLocationsCreated++
    }
  }

  const vendorItems = pending.filter((i) => i.vendorId)
  const blankItems = pending.filter((i) => !i.vendorId && !(i.location || '').trim())
  const namedItems = pending.filter((i) => !i.vendorId && (i.location || '').trim())

  let vendorLocationId: string | null = null
  if (vendorItems.length > 0) {
    vendorLocationId = (await getOrCreateVendorLocation()).id
  }

  let unassignedLocationId: string | null = null
  if (blankItems.length > 0) {
    const existing = locations.find((l) => l.name === UNASSIGNED_LOCATION_NAME)
    if (existing) {
      unassignedLocationId = existing.id
    } else {
      const ref = await createLocation({ name: UNASSIGNED_LOCATION_NAME, type: 'standard' })
      unassignedLocationId = ref.id
      newLocationsCreated++
    }
  }

  const writes: { id: string; storageEntries: InventoryItem['storageEntries'] }[] = []

  for (const item of namedItems) {
    const locationId = resolvedIds.get(item.location!.trim())
    if (!locationId) continue
    writes.push({
      id: item.id,
      storageEntries: [
        {
          id: crypto.randomUUID(),
          locationId,
          subLocationId: null,
          bin: item.bin ?? '',
          quantity: item.totalQuantity ?? 0,
          packSize: null,
        },
      ],
    })
  }

  for (const item of vendorItems) {
    if (!vendorLocationId) continue
    writes.push({
      id: item.id,
      storageEntries: [
        {
          id: crypto.randomUUID(),
          locationId: vendorLocationId,
          subLocationId: null,
          bin: '',
          quantity: item.totalQuantity ?? 0,
          packSize: null,
        },
      ],
    })
  }

  for (const item of blankItems) {
    if (!unassignedLocationId) continue
    writes.push({
      id: item.id,
      storageEntries: [
        {
          id: crypto.randomUUID(),
          locationId: unassignedLocationId,
          subLocationId: null,
          bin: item.bin ?? '',
          quantity: item.totalQuantity ?? 0,
          packSize: null,
        },
      ],
    })
  }

  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE)
    const batch = writeBatch(db)
    for (const w of chunk) {
      batch.update(doc(db, 'inventoryItems', w.id), { storageEntries: w.storageEntries, updatedAt: serverTimestamp() })
    }
    await batch.commit()
  }

  return { migratedCount: writes.length, newLocationsCreated }
}
