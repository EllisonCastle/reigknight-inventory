import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  type Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { EventStatus } from '../types'

export interface VenueConflict {
  eventId: string
  name: string
  startAt: Timestamp
  endAt: Timestamp
}

export interface VenueConflictResult {
  hasConflict: boolean
  conflicts: VenueConflict[]
}

/**
 * Overlap rule: A starts before B ends AND A ends after B starts.
 * Firestore only allows one inequality per query, so we filter `startAt < to`
 * server-side and check `endAt > from` client-side, per the spec pattern.
 */
export async function checkVenueConflict(
  venueId: string,
  from: Timestamp,
  to: Timestamp,
  excludeEventId?: string,
): Promise<VenueConflictResult> {
  const snap = await getDocs(
    query(
      collection(db, 'events'),
      where('venueId', '==', venueId),
      where('startAt', '<', to),
    ),
  )

  const conflicts: VenueConflict[] = []
  snap.forEach((d) => {
    const e = d.data() as Record<string, unknown>
    const endAt = e.endAt as Timestamp
    if (
      d.id !== excludeEventId &&
      e.status !== 'cancelled' &&
      endAt.toMillis() > from.toMillis()
    ) {
      conflicts.push({
        eventId: d.id,
        name: e.name as string,
        startAt: e.startAt as Timestamp,
        endAt,
      })
    }
  })

  return { hasConflict: conflicts.length > 0, conflicts }
}

export interface InventoryAvailability {
  totalQuantity: number
  reserved: number
  available: number
  requestedQty: number
  isAvailable: boolean
}

/**
 * `availableForRentalCeiling` is totalQuantity minus units marked Needs Repair /
 * Needs Replacement (see src/lib/inventoryStatus.ts) — units out of service can't
 * be assigned to an event even if no one else has reserved them yet.
 */
export async function checkInventoryAvailability(
  itemId: string,
  totalQuantity: number,
  availableForRentalCeiling: number,
  from: Timestamp,
  to: Timestamp,
  requestedQty: number,
  excludeReservationId?: string,
): Promise<InventoryAvailability> {
  const snap = await getDocs(
    query(
      collection(db, 'reservations'),
      where('itemId', '==', itemId),
      where('reservedFrom', '<', to),
    ),
  )

  let reserved = 0
  snap.forEach((d) => {
    const r = d.data() as Record<string, unknown>
    const reservedTo = r.reservedTo as Timestamp
    if (
      d.id !== excludeReservationId &&
      r.eventStatus !== 'cancelled' &&
      reservedTo.toMillis() > from.toMillis()
    ) {
      reserved += r.quantity as number
    }
  })

  const available = availableForRentalCeiling - reserved
  return {
    totalQuantity,
    reserved,
    available,
    requestedQty,
    isAvailable: requestedQty <= available,
  }
}

/** Keeps reservations' denormalized eventStatus in sync when an event's status changes. */
export async function syncReservationsEventStatus(eventId: string, status: EventStatus) {
  const snap = await getDocs(query(collection(db, 'reservations'), where('eventId', '==', eventId)))
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.forEach((d) => batch.update(d.ref, { eventStatus: status }))
  await batch.commit()
}
