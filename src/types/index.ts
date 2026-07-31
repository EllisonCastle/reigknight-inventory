import type { Timestamp } from 'firebase/firestore'
import type { PersonRole } from '../constants/people'
import type { TaskStatus, TaskType } from '../constants/tasks'
import type { AssigneeType } from '../constants/agenda'

export interface Venue {
  id: string
  name: string
  description: string
  capacity: number | null
  photoUrl: string
  createdAt: Timestamp | null
}

export interface InventoryPhoto {
  url: string
  path: string
  isPrimary: boolean
  sortOrder: number
}

export interface StatusBreakdown {
  good: number
  needsRepair: number
  needsReplacement: number
}

/** One place an item's units live: a location, optional sub-location, optional free-text bin, and a quantity. */
export interface StorageEntry {
  id: string
  locationId: string
  subLocationId: string | null
  bin: string
  quantity: number
  packSize: number | null
}

export interface InventoryItem {
  id: string
  name: string
  description: string
  category: string
  material: string
  color: string
  colorCustom: string
  tags: string[]
  storageEntries: StorageEntry[]
  condition: string
  statusBreakdown: StatusBreakdown
  photos: InventoryPhoto[]
  model: string
  notes: string
  dimensions: string
  costPrice: number | null
  rentalPrice: number | null
  vendorId: string
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  /**
   * Pre-Phase-B fields. Left dormant on migrated docs (not stripped, per the
   * user's explicit call — original data stays recoverable on the doc itself).
   * Only read as a defensive fallback for items that haven't run through the
   * storage-entries migration yet; never written by any code after Checkpoint 1.
   */
  location?: string
  bin?: string
  totalQuantity?: number
}

/** subLocations are embedded on the parent LocationDoc — items reference subLocationId only, never a denormalized name, so renames propagate for free. */
export interface SubLocation {
  id: string
  name: string
}

export interface LocationDoc {
  id: string
  name: string
  type: 'standard' | 'vendor'
  subLocations: SubLocation[]
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export const THROUGH_VENDOR_LOCATION_ID = 'through-vendor'

export type EventStatus = 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

export const EVENT_STATUSES: EventStatus[] = [
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
]

export interface EventDoc {
  id: string
  name: string
  venueId: string
  startAt: Timestamp
  endAt: Timestamp
  status: EventStatus
  clientName: string
  clientContact: string
  notes: string
  checkinEventId: string
  shareToken: string
  createdAt: Timestamp | null
  createdBy: string
}

export interface Reservation {
  id: string
  eventId: string
  itemId: string
  quantityInvoiced: number
  quantityCommitted: number
  reservedFrom: Timestamp
  reservedTo: Timestamp
  eventStatus: EventStatus
  dropOffLocation: string
  createdAt: Timestamp | null
  /** Pre-Checkpoint-3 field, dormant on old reservations — read as a fallback until edited. */
  quantity?: number
}

export interface Person {
  id: string
  fullName: string
  email: string
  phone: string
  role: PersonRole
  authUid: string
  active: boolean
  createdAt: Timestamp | null
}

export interface TaskDoc {
  id: string
  eventId: string
  title: string
  description: string
  taskType: TaskType
  assigneeIds: string[]
  dueDate: Timestamp | null
  status: TaskStatus
  completedAt: Timestamp | null
  createdAt: Timestamp | null
  createdBy: string
}

export interface VendorDoc {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  notes: string
  createdAt: Timestamp | null
}

/** agendaItems/{itemId} — one cue in an event's schedule. isPublic controls whether it also appears on the guest agenda. */
export interface AgendaItemDoc {
  id: string
  eventId: string
  title: string
  description: string
  startAt: Timestamp
  endAt: Timestamp | null
  isPublic: boolean
  assigneeType: AssigneeType
  assigneePersonId: string | null
  assigneeVendorId: string | null
  location: string
  sortOrder: number
  notes: string
  createdAt: Timestamp | null
  createdBy: string
}

export type MessageAuthorRole = 'admin' | 'staff'

/** taskThreads/{threadId} — a discussion thread scoped to one task. */
export interface TaskThreadDoc {
  id: string
  taskId: string
  eventId: string
  title: string
  createdBy: string
  createdByName: string
  createdAt: Timestamp | null
  lastMessageAt: Timestamp
  messageCount: number
  resolved: boolean
  resolvedAt: Timestamp | null
  resolvedBy: string | null
}

/** taskMessages/{messageId} — one message within a taskThread. */
export interface TaskMessageDoc {
  id: string
  threadId: string
  taskId: string
  authorUid: string
  authorName: string
  authorRole: MessageAuthorRole
  body: string
  mentionedPersonIds: string[]
  createdAt: Timestamp
  editedAt: Timestamp | null
}

/** taskReadReceipts/{taskId_authorUid} — per-user, per-task "last saw the Discussion section" marker. */
export interface TaskReadReceiptDoc {
  id: string
  taskId: string
  userUid: string
  lastReadAt: Timestamp
}

/** publicViews/{shareToken} — a self-contained, read-only snapshot of one event. */
export interface PublicViewSnapshot {
  eventId: string
  event: {
    name: string
    venueName: string
    startAt: Timestamp
    endAt: Timestamp
    status: EventStatus
    clientName: string
  }
  inventory: Array<{
    itemId: string
    itemName: string
    quantity: number
    primaryPhotoUrl: string | null
  }>
  tasks: Array<{
    id: string
    title: string
    taskType: TaskType
    assigneeNames: string[]
    dueDate: Timestamp | null
    status: TaskStatus
  }>
  guestAgenda: Array<{
    id: string
    title: string
    description: string
    startAt: Timestamp
    endAt: Timestamp | null
    location: string
  }>
  checkinSummary: null
  updatedAt: Timestamp
}
