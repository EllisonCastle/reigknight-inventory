import type { Timestamp } from 'firebase/firestore'
import type { TaskReadReceiptDoc, TaskThreadDoc } from '../types'

export const EDIT_WINDOW_MS = 5 * 60 * 1000

/** Mirrors the firestore.rules 5-minute edit window for taskMessages. */
export function canStillEdit(createdAt: Timestamp | null | undefined): boolean {
  if (!createdAt) return false
  return Date.now() - createdAt.toMillis() < EDIT_WINDOW_MS
}

export function receiptMapByTask(receipts: TaskReadReceiptDoc[]): Map<string, Timestamp> {
  return new Map(receipts.map((r) => [r.taskId, r.lastReadAt]))
}

/** Resolved threads never count as unread, even if they had activity after the last read. */
function isThreadUnread(thread: TaskThreadDoc, lastReadAt: Timestamp | undefined): boolean {
  if (thread.resolved) return false
  if (!thread.lastMessageAt) return false
  if (!lastReadAt) return true
  return thread.lastMessageAt.toMillis() > lastReadAt.toMillis()
}

/** Threads on one task that are unread for the current viewer. */
export function unreadThreadsForTask(
  allThreads: TaskThreadDoc[],
  taskId: string,
  receiptsByTask: Map<string, Timestamp>,
): TaskThreadDoc[] {
  return allThreads.filter((t) => t.taskId === taskId && isThreadUnread(t, receiptsByTask.get(taskId)))
}

/**
 * taskId -> unread thread count. `visibleTaskIds` scopes this to what the
 * viewer should be notified about: 'all' for admin, or the set of task ids
 * a staff member is assigned to.
 */
export function unreadCountsByTask(
  allThreads: TaskThreadDoc[],
  receiptsByTask: Map<string, Timestamp>,
  visibleTaskIds: Set<string> | 'all',
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const thread of allThreads) {
    if (visibleTaskIds !== 'all' && !visibleTaskIds.has(thread.taskId)) continue
    if (!isThreadUnread(thread, receiptsByTask.get(thread.taskId))) continue
    counts.set(thread.taskId, (counts.get(thread.taskId) ?? 0) + 1)
  }
  return counts
}

export function totalUnreadCount(unreadByTask: Map<string, number>): number {
  return [...unreadByTask.values()].reduce((sum, n) => sum + n, 0)
}

/** Most recently active unread threads, for the global nav bell dropdown. */
export function recentUnreadThreads(
  allThreads: TaskThreadDoc[],
  receiptsByTask: Map<string, Timestamp>,
  visibleTaskIds: Set<string> | 'all',
  limit = 10,
): TaskThreadDoc[] {
  return allThreads
    .filter(
      (t) => (visibleTaskIds === 'all' || visibleTaskIds.has(t.taskId)) && isThreadUnread(t, receiptsByTask.get(t.taskId)),
    )
    .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0))
    .slice(0, limit)
}
