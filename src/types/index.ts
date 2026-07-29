import type { Timestamp } from 'firebase/firestore'
import type { PersonRole } from '../constants/people'
import type { TaskStatus, TaskType } from '../constants/tasks'

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
  assigneeId: string
  dueDate: Timestamp | null
  status: TaskStatus
  completedAt: Timestamp | null
  createdAt: Timestamp | null
  createdBy: string
}
