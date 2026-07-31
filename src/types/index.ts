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

export interface InventoryItem {
  id: string
  name: string
  description: string
  category: string
  material: string
  color: string
  colorCustom: string
  tags: string[]
  totalQuantity: number
  location: string
  bin: string
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
}

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
  quantity: number
  reservedFrom: Timestamp
  reservedTo: Timestamp
  eventStatus: EventStatus
  dropOffLocation: string
  createdAt: Timestamp | null
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
