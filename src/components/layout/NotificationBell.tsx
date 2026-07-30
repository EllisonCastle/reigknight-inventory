import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useUnreadTaskMessages } from '../../hooks/useUnreadTaskMessages'
import { formatRelativeTime } from '../../lib/datetime'

export function NotificationBell() {
  const { totalUnread, recentUnread } = useUnreadTaskMessages()
  const [open, setOpen] = useState(false)

  const threads = open ? recentUnread(10) : []

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={totalUnread > 0 ? `${totalUnread} unread task messages` : 'Notifications'}
        className="relative flex h-11 w-11 items-center justify-center rounded-md text-charcoal hover:bg-surface"
      >
        <span className="text-xl leading-none" aria-hidden="true">
          🔔
        </span>
        {totalUnread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-medium leading-none text-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-80 max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="border-b border-gray-200 px-4 py-2.5 text-base font-semibold text-charcoal">
              Unread discussions
            </div>
            {threads.length === 0 ? (
              <p className="px-4 py-4 text-base text-gray-500">You're all caught up.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {threads.map((thread) => (
                  <Link
                    key={thread.id}
                    to={`/tasks/${thread.taskId}`}
                    onClick={() => setOpen(false)}
                    className="block border-b border-gray-100 px-4 py-2.5 last:border-b-0 hover:bg-surface"
                  >
                    <p className="text-base font-medium text-charcoal">{thread.title}</p>
                    <p className="text-sm text-gray-500">{formatRelativeTime(thread.lastMessageAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
