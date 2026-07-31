import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTaskThreads } from '../../hooks/useTaskThreads'
import { useMyReadReceipts, markTaskRead } from '../../hooks/useReadReceipts'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { ThreadPanel } from './ThreadPanel'
import { MentionTextarea } from './MentionTextarea'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { FormRow, Input } from '../ui/Field'
import { ErrorNotice } from '../ui/ErrorNotice'
import { receiptMapByTask, unreadThreadsForTask } from '../../lib/taskMessaging'
import type { Person } from '../../types'

interface DiscussionSectionProps {
  taskId: string
  eventId: string
  people: Person[]
}

export function DiscussionSection({ taskId, eventId, people }: DiscussionSectionProps) {
  const { threads, loading, error, createThread, resolveThread, reopenThread } = useTaskThreads(taskId, eventId)
  const { receipts } = useMyReadReceipts()
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const [showResolved, setShowResolved] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newThreadOpen, setNewThreadOpen] = useState(false)

  const mentionCandidates = useMemo(
    () => people.filter((p) => p.active && p.authUid && (p.role === 'admin' || p.role === 'staff')),
    [people],
  )

  const receiptsByTask = useMemo(() => receiptMapByTask(receipts), [receipts])
  const unreadIds = useMemo(
    () => new Set(unreadThreadsForTask(threads, taskId, receiptsByTask).map((t) => t.id)),
    [threads, taskId, receiptsByTask],
  )

  // Marks read the moment this section is on screen — not just when the task
  // page loads — so a task page visit that never scrolls here still leaves
  // threads correctly marked unread.
  useEffect(() => {
    if (user) markTaskRead(taskId, user.uid).catch(() => {})
  }, [taskId, user])

  const visible = threads.filter((t) => showResolved || !t.resolved)

  const handleCreate = async (title: string, body: string, mentionedPersonIds: string[]) => {
    const id = await createThread(title, body, mentionedPersonIds)
    setNewThreadOpen(false)
    setExpandedId(id)
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-charcoal">Discussion</h2>
        <Button onClick={() => setNewThreadOpen(true)}>+ New thread</Button>
      </div>

      <label className="mb-3 flex min-h-[44px] cursor-pointer items-center gap-2 text-base text-charcoal">
        <input
          type="checkbox"
          checked={showResolved}
          onChange={(e) => setShowResolved(e.target.checked)}
          className="h-5 w-5"
        />
        Show resolved
      </label>

      <ErrorNotice message={error} />

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="text-base text-gray-500">No discussion yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((thread) => (
            <ThreadPanel
              key={thread.id}
              thread={thread}
              taskId={taskId}
              expanded={expandedId === thread.id}
              onToggle={() => setExpandedId(expandedId === thread.id ? null : thread.id)}
              unread={unreadIds.has(thread.id)}
              isAdmin={isAdmin}
              currentUid={user?.uid}
              mentionCandidates={mentionCandidates}
              onResolve={resolveThread}
              onReopen={reopenThread}
            />
          ))}
        </div>
      )}

      <Modal open={newThreadOpen} onClose={() => setNewThreadOpen(false)} title="New thread">
        <NewThreadForm onCancel={() => setNewThreadOpen(false)} onSubmit={handleCreate} mentionCandidates={mentionCandidates} />
      </Modal>
    </div>
  )
}

function NewThreadForm({
  onCancel,
  onSubmit,
  mentionCandidates,
}: {
  onCancel: () => void
  onSubmit: (title: string, body: string, mentionedPersonIds: string[]) => Promise<void>
  mentionCandidates: Person[]
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mentionedIds, setMentionedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!body.trim()) {
      setError('First message is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit(title, body, mentionedIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormRow label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
      </FormRow>
      <FormRow label="First message">
        <MentionTextarea
          value={body}
          onChange={setBody}
          mentionedIds={mentionedIds}
          onMentionedIdsChange={setMentionedIds}
          people={mentionCandidates}
          maxLength={2000}
          rows={3}
          placeholder="@ to mention someone"
          className="min-h-[44px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-charcoal focus:border-regal focus:outline-none focus:ring-1 focus:ring-regal"
        />
      </FormRow>
      {error && <p className="text-base text-red-600">{error}</p>}
      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Posting…' : 'Start thread'}
        </Button>
      </div>
    </form>
  )
}
