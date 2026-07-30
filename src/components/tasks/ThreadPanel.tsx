import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useTaskMessages } from '../../hooks/useTaskMessages'
import { MessageItem } from './MessageItem'
import { Badge } from '../ui/Badge'
import { formatRelativeTime } from '../../lib/datetime'
import type { TaskThreadDoc } from '../../types'

interface ThreadPanelProps {
  thread: TaskThreadDoc
  taskId: string
  expanded: boolean
  onToggle: () => void
  unread: boolean
  isAdmin: boolean
  currentUid: string | undefined
  onResolve: (threadId: string) => Promise<void>
  onReopen: (threadId: string) => Promise<void>
}

export function ThreadPanel({
  thread,
  taskId,
  expanded,
  onToggle,
  unread,
  isAdmin,
  currentUid,
  onResolve,
  onReopen,
}: ThreadPanelProps) {
  const { messages, loading, postMessage, editMessage, deleteMessage } = useTaskMessages(
    expanded ? thread.id : undefined,
  )
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!draft.trim() || posting) return
    setPosting(true)
    try {
      await postMessage(taskId, draft)
      setDraft('')
    } finally {
      setPosting(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handlePost()
    }
  }

  const handleResolveClick = (e: MouseEvent) => {
    e.stopPropagation()
    if (thread.resolved) {
      onReopen(thread.id)
    } else {
      onResolve(thread.id)
    }
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${expanded ? 'border-regal' : 'border-gray-200'}`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-2.5 text-left ${expanded ? 'bg-regal-light' : 'bg-white'}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-medium text-charcoal">{thread.title}</span>
            {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" aria-label="Unread" />}
            {thread.resolved && <Badge>Resolved</Badge>}
          </div>
          <p className="text-sm text-gray-500">
            {thread.messageCount ?? 0} message{(thread.messageCount ?? 0) === 1 ? '' : 's'} ·{' '}
            {formatRelativeTime(thread.lastMessageAt)}
          </p>
        </div>
        {isAdmin && (
          <span
            role="button"
            tabIndex={0}
            onClick={handleResolveClick}
            className="min-h-[44px] shrink-0 whitespace-nowrap px-1 text-sm font-medium leading-[44px] text-regal hover:underline"
          >
            {thread.resolved ? 'Reopen' : 'Mark resolved'}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 bg-white">
          <div className="max-h-96 divide-y divide-gray-100 overflow-y-auto px-3">
            {loading ? (
              <p className="py-3 text-base text-gray-500">Loading…</p>
            ) : (
              messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  currentUid={currentUid}
                  isAdmin={isAdmin}
                  onEdit={editMessage}
                  onDelete={deleteMessage}
                />
              ))
            )}
          </div>

          <div className="flex gap-2 border-t border-gray-200 bg-surface p-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={2000}
              rows={1}
              placeholder="Write a reply…"
              className="min-h-[44px] flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-charcoal focus:border-regal focus:outline-none focus:ring-1 focus:ring-regal"
            />
            <button
              type="button"
              onClick={handlePost}
              disabled={posting || !draft.trim()}
              className="min-h-[44px] rounded-md bg-regal px-4 text-base font-medium text-white disabled:opacity-50"
            >
              {posting ? '…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
