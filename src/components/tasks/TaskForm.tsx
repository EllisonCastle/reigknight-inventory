import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Label, Select, TextArea } from '../ui/Field'
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_TYPES, TASK_TYPE_LABELS } from '../../constants/tasks'
import { dateInputToTimestamp, timestampToDateInput } from '../../lib/datetime'
import type { Person, TaskDoc } from '../../types'
import type { TaskStatus, TaskType } from '../../constants/tasks'

export interface TaskFormValues {
  title: string
  description: string
  taskType: TaskType
  assigneeIds: string[]
  dueDate: ReturnType<typeof dateInputToTimestamp>
  status: TaskStatus
}

interface TaskFormProps {
  initial?: TaskDoc
  people: Person[]
  onCancel: () => void
  onSubmit: (values: TaskFormValues) => Promise<void>
}

function defaultDueDate(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function TaskForm({ initial, people, onCancel, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [taskType, setTaskType] = useState<TaskType>(initial?.taskType ?? 'other')
  const [assigneeIds, setAssigneeIds] = useState<string[]>(initial?.assigneeIds ?? [])
  const [dueDate, setDueDate] = useState(initial?.dueDate ? timestampToDateInput(initial.dueDate) : defaultDueDate())
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activePeople = people.filter((p) => p.active)

  const toggleAssignee = (personId: string) => {
    setAssigneeIds((prev) => (prev.includes(personId) ? prev.filter((id) => id !== personId) : [...prev, personId]))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    if (!dueDate) {
      setError('Due date is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        taskType,
        assigneeIds,
        dueDate: dateInputToTimestamp(dueDate),
        status,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormRow label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </FormRow>

      <FormRow label="Description">
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormRow>

      <FormRow label="Type">
        <Select value={taskType} onChange={(e) => setTaskType(e.target.value as TaskType)}>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {TASK_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </FormRow>

      <div>
        <Label>Assignees</Label>
        {activePeople.length === 0 ? (
          <p className="text-base text-gray-500">No active people yet — add some on the People page.</p>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-md border border-gray-300 bg-white">
            {activePeople.map((p) => (
              <label
                key={p.id}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 border-b border-gray-100 px-3 text-base text-charcoal last:border-b-0 hover:bg-surface"
              >
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(p.id)}
                  onChange={() => toggleAssignee(p.id)}
                  className="h-5 w-5"
                />
                {p.fullName}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Due date">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
        </FormRow>
        <FormRow label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </FormRow>
      </div>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Add task'}
        </Button>
      </div>
    </form>
  )
}
