import { getCommittedQuantity } from './reservationQuantity'
import type { InventoryItem, LocationDoc, Reservation, VendorDoc } from '../types'

export interface PullListLineItem {
  lineId: string
  reservationId: string
  itemId: string
  itemName: string
  quantity: number
  location: string
  bin: string
  dropOffLocation: string
}

export interface PullListGroup {
  location: string
  lines: PullListLineItem[]
}

function resolveLocationLabel(locationId: string, subLocationId: string | null, locationsById: Map<string, LocationDoc>): string {
  const loc = locationsById.get(locationId)
  if (!loc) return 'Unknown location'
  const sub = subLocationId ? loc.subLocations.find((s) => s.id === subLocationId) : undefined
  return sub ? `${loc.name} › ${sub.name}` : loc.name
}

/**
 * Maps one reservation to its pull-list line item(s): one line per storage entry that
 * contributes to covering the reserved quantity, largest entry first so movers make the
 * fewest stops. Kits (Checkpoint 4) will extend this further to explode into child
 * components, each resolved through its own storageEntries. Nothing outside this
 * function needs to change for either extension.
 */
function explodeReservation(
  reservation: Reservation,
  itemsById: Map<string, InventoryItem>,
  vendorsById: Map<string, VendorDoc>,
  locationsById: Map<string, LocationDoc>,
): PullListLineItem[] {
  // Pull list quantity is the committed amount — what's actually blocked/set aside for the
  // event, including any bin-rounded spare — not the invoiced amount the customer is billed for.
  const committedQty = getCommittedQuantity(reservation)
  // A kit's own parent-level reservation commits 0 when the kit is a virtual bundle (Checkpoint
  // 4) — nothing physical to pull for the kit itself, its auto-generated child reservations
  // (real documents, itemId = each component) already explode into their own lines below.
  if (committedQty <= 0) return []

  const item = itemsById.get(reservation.itemId)
  if (!item) {
    return [
      {
        lineId: `${reservation.id}-deleted`,
        reservationId: reservation.id,
        itemId: reservation.itemId,
        itemName: '(deleted item)',
        quantity: committedQty,
        location: 'Unknown',
        bin: '',
        dropOffLocation: reservation.dropOffLocation || '',
      },
    ]
  }

  if (item.vendorId) {
    const vendor = vendorsById.get(item.vendorId)
    return [
      {
        lineId: `${reservation.id}-vendor`,
        reservationId: reservation.id,
        itemId: item.id,
        itemName: item.name,
        quantity: committedQty,
        location: `Through Vendor: ${vendor?.name ?? 'Unknown vendor'}`,
        bin: '',
        dropOffLocation: reservation.dropOffLocation || '',
      },
    ]
  }

  if (!item.storageEntries?.length) {
    // Not yet migrated — fall back to the dormant legacy fields, same single-line behavior as Phase A.
    return [
      {
        lineId: `${reservation.id}-legacy`,
        reservationId: reservation.id,
        itemId: item.id,
        itemName: item.name,
        quantity: committedQty,
        location: item.location || 'Unknown location',
        bin: item.bin || '',
        dropOffLocation: reservation.dropOffLocation || '',
      },
    ]
  }

  const entries = [...item.storageEntries].sort((a, b) => b.quantity - a.quantity)
  const lines: PullListLineItem[] = []
  let remaining = committedQty
  for (const entry of entries) {
    if (remaining <= 0) break
    const take = Math.min(entry.quantity, remaining)
    if (take <= 0) continue
    lines.push({
      lineId: `${reservation.id}-${entry.id}`,
      reservationId: reservation.id,
      itemId: item.id,
      itemName: item.name,
      quantity: take,
      location: resolveLocationLabel(entry.locationId, entry.subLocationId, locationsById),
      bin: entry.bin || '',
      dropOffLocation: reservation.dropOffLocation || '',
    })
    remaining -= take
  }
  return lines
}

/** Builds the mover's pull list for an event: reservations grouped by storage location, sorted for efficient trips. */
export function buildPullList(
  reservations: Reservation[],
  itemsById: Map<string, InventoryItem>,
  vendorsById: Map<string, VendorDoc>,
  locationsById: Map<string, LocationDoc>,
): PullListGroup[] {
  const lines = reservations.flatMap((r) => explodeReservation(r, itemsById, vendorsById, locationsById))

  const byLocation = new Map<string, PullListLineItem[]>()
  for (const line of lines) {
    const existing = byLocation.get(line.location)
    if (existing) {
      existing.push(line)
    } else {
      byLocation.set(line.location, [line])
    }
  }

  return [...byLocation.entries()]
    .map(([location, groupLines]) => ({
      location,
      lines: [...groupLines].sort((a, b) => a.itemName.localeCompare(b.itemName)),
    }))
    .sort((a, b) => a.location.localeCompare(b.location))
}
