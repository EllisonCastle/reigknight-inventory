import { useMemo } from 'react'
import { useAllTaskThreads } from './useTaskThreads'
import { useMentionedTaskIds } from './useTaskMessages'
import { useMyReadReceipts } from './useReadReceipts'
import { useAllTasks } from './useTasks'
import { usePermissions } from './usePermissions'
import { receiptMapByTask, recentUnreadThreads, totalUnreadCount, unreadCountsByTask } from '../lib/taskMessaging'

/**
 * Unread task-discussion data for the current viewer, scoped per the
 * notification rules: admin sees every thread; a staff member sees threads
 * on tasks they're assigned to OR tasks where they've been @-mentioned in a
 * message (even if not assigned); anyone else (contractor, viewer, signed
 * out) sees nothing — useAllTaskThreads only subscribes for admin/staff in
 * the first place, matching what the rules actually allow.
 */
export function useUnreadTaskMessages() {
  const { isAdmin, isAdminOrStaff, personId } = usePermissions()
  const { threads } = useAllTaskThreads(isAdminOrStaff)
  const { receipts } = useMyReadReceipts()
  const { tasks } = useAllTasks()
  const mentionedTaskIds = useMentionedTaskIds(personId, isAdminOrStaff && !isAdmin)

  const receiptsByTask = useMemo(() => receiptMapByTask(receipts), [receipts])

  const visibleTaskIds = useMemo(() => {
    if (isAdmin) return 'all' as const
    const assigned = tasks.filter((t) => personId && t.assigneeIds.includes(personId)).map((t) => t.id)
    return new Set([...assigned, ...mentionedTaskIds])
  }, [isAdmin, tasks, personId, mentionedTaskIds])

  const unreadByTask = useMemo(
    () => unreadCountsByTask(threads, receiptsByTask, visibleTaskIds),
    [threads, receiptsByTask, visibleTaskIds],
  )

  return {
    unreadByTask,
    totalUnread: totalUnreadCount(unreadByTask),
    recentUnread: (limit = 10) => recentUnreadThreads(threads, receiptsByTask, visibleTaskIds, limit),
  }
}
