import { useMemo } from 'react'
import { useAllTaskThreads } from './useTaskThreads'
import { useMyReadReceipts } from './useReadReceipts'
import { useAllTasks } from './useTasks'
import { usePermissions } from './usePermissions'
import { receiptMapByTask, recentUnreadThreads, totalUnreadCount, unreadCountsByTask } from '../lib/taskMessaging'

/**
 * Unread task-discussion data for the current viewer, scoped per the
 * notification rules: admin sees every thread; a staff member sees only
 * threads on tasks they're assigned to; anyone else (contractor, viewer,
 * signed out) sees nothing — useAllTaskThreads only subscribes for
 * admin/staff in the first place, matching what the rules actually allow.
 */
export function useUnreadTaskMessages() {
  const { isAdmin, isAdminOrStaff, personId } = usePermissions()
  const { threads } = useAllTaskThreads(isAdminOrStaff)
  const { receipts } = useMyReadReceipts()
  const { tasks } = useAllTasks()

  const receiptsByTask = useMemo(() => receiptMapByTask(receipts), [receipts])

  const visibleTaskIds = useMemo(() => {
    if (isAdmin) return 'all' as const
    return new Set(tasks.filter((t) => personId && t.assigneeIds.includes(personId)).map((t) => t.id))
  }, [isAdmin, tasks, personId])

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
