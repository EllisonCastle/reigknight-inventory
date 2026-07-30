import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTaskThreads } from '../../hooks/useTaskThreads'
import { useMyReadReceipts, markTaskRead } from '../../hooks/useReadReceipts'
import { useAuth } from '../../hooks/useAuth'
import { usePermissions } from '../../hooks/usePermissions'
import { ThreadPanel } from './ThreadPanel'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { FormRow, Input, TextArea } from '../ui/Field'
import { ErrorNotice } from '../ui/ErrorNotice'
import { receiptMapByTask, unreadThreadsForTask } from '../../lib/taskMessaging'

interface DiscussionSectionProps {
  taskId: string
  eventId: string
}

export function DiscussionSection({ taskId, eventId }: DiscussionSectionProps) {
  const { threads, loading, error, createThread, resolveThread, reopenThread } = useTaskThreads(taskId, eventId)
  const { receipts } = useMyReadReceipts()
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const [showResolved, setShowResolved] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newThreadOpen, setNewThreadOpen] = useState(false)

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

  const handleCreate = async (title: string, body: string) => {
    const id = await createThread(title, body)
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
              onResolve={resolveThread}
              onReopen={reopenThread}
            />
          ))}
        </div>
      )}

      <Modal open={newThreadOpen} onClose={() => setNewThreadOpen(false)} title="New thread">
        <NewThreadForm onCancel={() => setNewThreadOpen(false)} onSubmit={handleCreate} />
      </Modal>
    </div>
  )
}

function NewThreadForm({
  onCancel,
  onSubmit,
}: {
  onCancel: () => void
  onSubmit: (title: string, body: string) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
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
      await onSubmit(title, body)
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
        <TextArea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3} required />
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
