import { useState, type MouseEvent } from 'react'
import { useTaskMessages } from '../../hooks/useTaskMessages'
import { MessageItem } from './MessageItem'
import { MentionTextarea } from './MentionTextarea'
import { Badge } from '../ui/Badge'
import { formatRelativeTime } from '../../lib/datetime'
import type { Person, TaskThreadDoc } from '../../types'

interface ThreadPanelProps {
  thread: TaskThreadDoc
  taskId: string
  expanded: boolean
  onToggle: () => void
  unread: boolean
  isAdmin: boolean
  currentUid: string | undefined
  mentionCandidates: Person[]
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
  mentionCandidates,
  onResolve,
  onReopen,
}: ThreadPanelProps) {
  const { messages, loading, postMessage, editMessage, deleteMessage } = useTaskMessages(
    expanded ? thread.id : undefined,
  )
  const [draft, setDraft] = useState('')
  const [mentionedIds, setMentionedIds] = useState<string[]>([])
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!draft.trim() || posting) return
    setPosting(true)
    try {
      await postMessage(taskId, draft, mentionedIds)
      setDraft('')
      setMentionedIds([])
    } finally {
      setPosting(false)
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
            <MentionTextarea
              value={draft}
              onChange={setDraft}
              mentionedIds={mentionedIds}
              onMentionedIdsChange={setMentionedIds}
              people={mentionCandidates}
              onSubmitShortcut={handlePost}
              maxLength={2000}
              rows={1}
              placeholder="Write a reply… (@ to mention someone)"
              className="min-h-[44px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-charcoal focus:border-regal focus:outline-none focus:ring-1 focus:ring-regal"
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
