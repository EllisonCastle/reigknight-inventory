import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { TextArea } from '../ui/Field'
import { formatRelativeTime } from '../../lib/datetime'
import { canStillEdit } from '../../lib/taskMessaging'
import type { TaskMessageDoc } from '../../types'

interface MessageItemProps {
  message: TaskMessageDoc
  currentUid: string | undefined
  isAdmin: boolean
  onEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function MessageItem({ message, currentUid, isAdmin, onEdit, onDelete }: MessageItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.body)
  const [saving, setSaving] = useState(false)

  const isOwn = message.authorUid === currentUid
  const editable = isOwn && canStillEdit(message.createdAt)
  const deletable = isOwn || isAdmin

  const handleSave = async () => {
    if (!draft.trim()) return
    setSaving(true)
    try {
      await onEdit(message.id, draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this message? This cannot be undone.')) return
    await onDelete(message.id)
  }

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-charcoal">{message.authorName}</span>
        <Badge tone="regal">{message.authorRole === 'admin' ? 'Admin' : 'Staff'}</Badge>
        <span className="text-sm text-gray-400">{formatRelativeTime(message.createdAt)}</span>
        {message.editedAt && <span className="text-sm text-gray-400">(edited)</span>}
        <div className="ml-auto flex gap-3">
          {editable && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-[44px] text-sm font-medium text-regal hover:underline"
            >
              Edit
            </button>
          )}
          {deletable && (
            <button
              type="button"
              onClick={handleDelete}
              className="min-h-[44px] text-sm font-medium text-red-600 hover:underline"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-1 flex flex-col gap-2">
          <TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            rows={2}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-h-[36px] rounded-md bg-regal px-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setDraft(message.body)
              }}
              className="min-h-[36px] rounded-md border border-gray-300 px-3 text-sm font-medium text-charcoal"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-base text-charcoal">{message.body}</p>
      )}
    </div>
  )
}
