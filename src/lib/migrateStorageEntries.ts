import { doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from './firebase'
import { getOrCreateVendorLocation } from './vendorLocation'
import type { InventoryItem, LocationDoc, SubLocation } from '../types'

const BATCH_SIZE = 400
export const UNASSIGNED_LOCATION_NAME = 'Unassigned / Needs Sorting'

export interface LocationMappingChoice {
  mode: 'existing' | 'new'
  locationId?: string
  newName?: string
  /** Optional — routes this raw value's items into a sub-location under the resolved location, matched by name (case-insensitive) or created if it doesn't exist yet. */
  subLocationName?: string
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

  // Two raw values set to "create new" with the same (trimmed, case-insensitive) name merge into
  // one created location — e.g. "Wash Bay" and "Car Washbay" both typed as "Carriage House" end up
  // pointed at the same new location, not two duplicates.
  const newLocationCache = new Map<string, string>()
  const resolvedIds = new Map<string, string>()
  for (const [value, choice] of Object.entries(mapping)) {
    if (choice.mode === 'existing' && choice.locationId) {
      resolvedIds.set(value, choice.locationId)
    } else {
      const name = (choice.newName ?? value).trim() || value
      const cacheKey = name.toLowerCase()
      const cachedId = newLocationCache.get(cacheKey)
      if (cachedId) {
        resolvedIds.set(value, cachedId)
      } else {
        const ref = await createLocation({ name, type: 'standard' })
        newLocationCache.set(cacheKey, ref.id)
        resolvedIds.set(value, ref.id)
        newLocationsCreated++
      }
    }
  }

  // Sub-location resolution, per raw value that requested one. Matched by name (case-insensitive)
  // against the resolved location's current sub-locations, or created if not found — cached so two
  // raw values mapping to the same location + sub-location name (the merge case) resolve to the
  // same sub-location instead of creating a duplicate.
  const subLocationCache = new Map<string, string>() // `${locationId}::${nameLower}` -> subLocationId
  const pendingNewSubs = new Map<string, SubLocation[]>() // locationId -> subs created during this run

  async function resolveSubLocation(locationId: string, rawName: string): Promise<string> {
    const name = rawName.trim()
    const key = `${locationId}::${name.toLowerCase()}`
    const cached = subLocationCache.get(key)
    if (cached) return cached

    const location = locations.find((l) => l.id === locationId)
    const existing = location?.subLocations.find((s) => s.name.trim().toLowerCase() === name.toLowerCase())
    if (existing) {
      subLocationCache.set(key, existing.id)
      return existing.id
    }

    const newSub: SubLocation = { id: crypto.randomUUID(), name }
    const alreadyCreated = pendingNewSubs.get(locationId) ?? []
    const nextSubs = [...(location?.subLocations ?? []), ...alreadyCreated, newSub]
    await updateDoc(doc(db, 'locations', locationId), { subLocations: nextSubs, updatedAt: serverTimestamp() })
    pendingNewSubs.set(locationId, [...alreadyCreated, newSub])
    subLocationCache.set(key, newSub.id)
    return newSub.id
  }

  const resolvedSubIds = new Map<string, string | null>()
  for (const [value, choice] of Object.entries(mapping)) {
    const locationId = resolvedIds.get(value)
    if (locationId && choice.subLocationName?.trim()) {
      resolvedSubIds.set(value, await resolveSubLocation(locationId, choice.subLocationName))
    } else {
      resolvedSubIds.set(value, null)
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
    const rawValue = item.location!.trim()
    const locationId = resolvedIds.get(rawValue)
    if (!locationId) continue
    writes.push({
      id: item.id,
      storageEntries: [
        {
          id: crypto.randomUUID(),
          locationId,
          subLocationId: resolvedSubIds.get(rawValue) ?? null,
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
