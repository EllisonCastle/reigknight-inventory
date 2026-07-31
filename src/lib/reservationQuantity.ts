import type { InventoryItem, Reservation } from '../types'

/** What the customer pays for. Falls back to the pre-Checkpoint-3 single `quantity` field for reservations that haven't been edited since. */
export function getInvoicedQuantity(r: Pick<Reservation, 'quantityInvoiced' | 'quantity'>): number {
  return r.quantityInvoiced ?? r.quantity ?? 0
}

/** What blocks inventory availability. Same legacy fallback as invoiced — before this checkpoint the two were the same number. */
export function getCommittedQuantity(r: Pick<Reservation, 'quantityCommitted' | 'quantity'>): number {
  return r.quantityCommitted ?? r.quantity ?? 0
}

/** The largest pack size among an item's storage entries — the unit used to round a committed-quantity suggestion up to whole bins. */
export function getBinRoundingPackSize(item: Pick<InventoryItem, 'storageEntries'>): number | null {
  const packSizes = (item.storageEntries ?? [])
    .map((e) => e.packSize)
    .filter((p): p is number => p != null && p > 0)
  return packSizes.length > 0 ? Math.max(...packSizes) : null
}

/** Rounds the invoiced quantity up to whole bins using the item's largest pack size; unchanged when no pack size is set (nothing to round to). */
export function suggestCommittedQuantity(item: Pick<InventoryItem, 'storageEntries'>, quantityInvoiced: number): number {
  const packSize = getBinRoundingPackSize(item)
  if (!packSize) return quantityInvoiced
  return Math.ceil(quantityInvoiced / packSize) * packSize
}
