import type { InventoryItem, Reservation, VendorDoc } from '../types'

export interface PullListLineItem {
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

/**
 * Maps one reservation to its pull-list line item(s). Phase A: always exactly
 * one line, straight from the item's flat `location`/`bin`. This is the seam
 * Phase B extends — a kit item will instead look up `components` and return
 * one line per child (each with its own location/bin), and the later
 * multi-location model will return one line per storage entry. Nothing
 * outside this function needs to change for either.
 */
function explodeReservation(
  reservation: Reservation,
  itemsById: Map<string, InventoryItem>,
  vendorsById: Map<string, VendorDoc>,
): PullListLineItem[] {
  const item = itemsById.get(reservation.itemId)
  if (!item) {
    return [
      {
        reservationId: reservation.id,
        itemId: reservation.itemId,
        itemName: '(deleted item)',
        quantity: reservation.quantity,
        location: 'Unknown',
        bin: '',
        dropOffLocation: reservation.dropOffLocation || '',
      },
    ]
  }

  const vendor = item.vendorId ? vendorsById.get(item.vendorId) : undefined
  const location = item.vendorId
    ? `Through Vendor: ${vendor?.name ?? 'Unknown vendor'}`
    : item.location || 'Unknown location'

  return [
    {
      reservationId: reservation.id,
      itemId: item.id,
      itemName: item.name,
      quantity: reservation.quantity,
      location,
      bin: item.bin || '',
      dropOffLocation: reservation.dropOffLocation || '',
    },
  ]
}

/** Builds the mover's pull list for an event: reservations grouped by storage location, sorted for efficient trips. */
export function buildPullList(
  reservations: Reservation[],
  itemsById: Map<string, InventoryItem>,
  vendorsById: Map<string, VendorDoc>,
): PullListGroup[] {
  const lines = reservations.flatMap((r) => explodeReservation(r, itemsById, vendorsById))

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
