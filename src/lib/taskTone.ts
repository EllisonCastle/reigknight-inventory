import type { TaskDoc } from '../types'

export type TaskTone = 'overdue' | 'dueSoon' | 'upcoming' | 'done'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

/** A task's urgency, independent of its explicit status field — drives color-coding everywhere tasks are listed. */
export function getTaskTone(task: Pick<TaskDoc, 'status' | 'dueDate'>): TaskTone {
  if (task.status === 'done') return 'done'
  if (!task.dueDate) return 'upcoming'
  const msUntilDue = task.dueDate.toMillis() - Date.now()
  if (msUntilDue < 0) return 'overdue'
  if (msUntilDue <= THREE_DAYS_MS) return 'dueSoon'
  return 'upcoming'
}

/** Left-border stripe class, matching the inventory needs-attention stripe pattern. */
export const TASK_TONE_STRIPE: Record<TaskTone, string> = {
  overdue: 'border-l-red-500',
  dueSoon: 'border-l-amber-500',
  upcoming: 'border-l-gray-300',
  done: 'border-l-green-400',
}
