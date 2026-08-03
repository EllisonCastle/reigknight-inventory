import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from './firebase'
import { getInvoicedQuantity } from './reservationQuantity'
import type {
  AgendaItemDoc,
  EventDoc,
  InventoryItem,
  InventoryPhoto,
  Person,
  PublicViewSnapshot,
  Reservation,
  TaskDoc,
  Venue,
} from '../types'

function primaryPhotoUrl(photos: InventoryPhoto[]): string | null {
  if (photos.length === 0) return null
  const primary = photos.find((p) => p.isPrimary)
  if (primary) return primary.url
  return [...photos].sort((a, b) => a.sortOrder - b.sortOrder)[0].url
}

/**
 * Regenerates the publicViews/{shareToken} snapshot for one event. Call this after any
 * save that could change what the read-only share link shows: the event itself, its
 * tasks, or its reservations. Mirrors syncReservationsEventStatus in availability.ts —
 * a plain async function invoked from the mutating hooks, not a Cloud Function.
 */
export async function publishEventSnapshot(eventId: string): Promise<void> {
  const eventRef = doc(db, 'events', eventId)
  const eventSnap = await getDoc(eventRef)
  if (!eventSnap.exists()) return
  const event = { id: eventSnap.id, ...eventSnap.data() } as EventDoc

  let shareToken = event.shareToken
  if (!shareToken) {
    shareToken = crypto.randomUUID()
    await updateDoc(eventRef, { shareToken })
  }

  const [venueSnap, tasksSnap, reservationsSnap, agendaItemsSnap] = await Promise.all([
    event.venueId ? getDoc(doc(db, 'venues', event.venueId)) : Promise.resolve(null),
    getDocs(query(collection(db, 'tasks'), where('eventId', '==', eventId))),
    getDocs(query(collection(db, 'reservations'), where('eventId', '==', eventId))),
    getDocs(query(collection(db, 'agendaItems'), where('eventId', '==', eventId))),
  ])
  const venueName = venueSnap?.exists() ? (venueSnap.data() as Venue).name : 'Unknown venue'

  const tasks = tasksSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskDoc)
  const reservations = reservationsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation)
  const agendaItems = agendaItemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as AgendaItemDoc)

  const assigneeIds = [...new Set(tasks.flatMap((t) => t.assigneeIds))]
  const itemIds = [...new Set(reservations.map((r) => r.itemId))]

  const [peopleDocs, itemDocs] = await Promise.all([
    Promise.all(assigneeIds.map((id) => getDoc(doc(db, 'people', id)))),
    Promise.all(itemIds.map((id) => getDoc(doc(db, 'inventoryItems', id)))),
  ])
  const peopleById = new Map(
    peopleDocs.filter((d) => d.exists()).map((d) => [d.id, (d.data() as Person).fullName]),
  )
  const itemsById = new Map(
    itemDocs.filter((d) => d.exists()).map((d) => [d.id, { id: d.id, ...d.data() } as InventoryItem]),
  )

  const snapshot: Omit<PublicViewSnapshot, 'updatedAt'> & { updatedAt: ReturnType<typeof serverTimestamp> } = {
    eventId,
    event: {
      name: event.name,
      venueName,
      startAt: event.startAt,
      endAt: event.endAt,
      status: event.status,
      clientName: event.clientName,
    },
    // Auto-generated child-component reservations (Checkpoint 4 kits) are excluded — the customer
    // sees the kit they booked, not its individual pulled components.
    inventory: reservations
      .filter((r) => !r.parentReservationId)
      .map((r) => {
        const item = itemsById.get(r.itemId)
        return {
          itemId: r.itemId,
          itemName: item?.name ?? '(deleted item)',
          // Customer-facing view shows what they're billed for, not any bin-rounded committed spare.
          quantity: getInvoicedQuantity(r),
          primaryPhotoUrl: item ? primaryPhotoUrl(item.photos) : null,
        }
      }),
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      taskType: t.taskType,
      assigneeNames: t.assigneeIds
        .map((id) => peopleById.get(id))
        .filter((name): name is string => Boolean(name)),
      dueDate: t.dueDate,
      status: t.status,
    })),
    // Guest agenda: isPublic:true items only. notes and every assignee field are
    // deliberately excluded — they must never reach the public snapshot.
    guestAgenda: agendaItems
      .filter((a) => a.isPublic)
      .sort((a, b) => {
        const diff = a.startAt.toMillis() - b.startAt.toMillis()
        return diff !== 0 ? diff : a.sortOrder - b.sortOrder
      })
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        startAt: a.startAt,
        endAt: a.endAt,
        location: a.location,
      })),
    checkinSummary: null,
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'publicViews', shareToken), snapshot)
}
