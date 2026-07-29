import { useMemo, useState } from 'react'
import { useTasksForEvent } from '../../hooks/useTasks'
import { TaskForm, type TaskFormValues } from './TaskForm'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Select } from '../ui/Field'
import { ErrorNotice } from '../ui/ErrorNotice'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_TYPES } from '../../constants/tasks'
import { formatDate } from '../../lib/datetime'
import type { Person, TaskDoc } from '../../types'

interface TaskManagerProps {
  eventId: string
  people: Person[]
}

const statusTone: Record<string, 'neutral' | 'amber' | 'red' | 'green'> = {
  todo: 'neutral',
  in_progress: 'amber',
  blocked: 'red',
  done: 'green',
}

export function TaskManager({ eventId, people }: TaskManagerProps) {
  const { tasks, loading, error, createTask, updateTask, setTaskStatus, deleteTask } = useTasksForEvent(eventId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TaskDoc | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const filtered = tasks.filter((t) => {
    if (typeFilter && t.taskType !== typeFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    if (assigneeFilter && t.assigneeId !== assigneeFilter) return false
    return true
  })

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (task: TaskDoc) => {
    setEditing(task)
    setModalOpen(true)
  }

  const handleSubmit = async (values: TaskFormValues) => {
    if (editing) {
      await updateTask(editing.id, values)
    } else {
      await createTask({ ...values, eventId })
    }
    setModalOpen(false)
  }

  const handleDelete = async (task: TaskDoc) => {
    if (!confirm(`Delete task "${task.title}"? This cannot be undone.`)) return
    await deleteTask(task.id)
  }

  const toggleDone = (task: TaskDoc) => {
    setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-charcoal">Tasks</h2>
        <Button onClick={openCreate}>+ Add task</Button>
      </div>

      <ErrorNotice message={error} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {TASK_TYPES.map((t) => (
            <option key={t} value={t}>
              {TASK_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="">All assignees</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-base text-gray-500">No tasks match.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={task.status === 'done'}
                  onChange={() => toggleDone(task)}
                  className="mt-1 h-5 w-5 shrink-0"
                  aria-label={`Mark "${task.title}" ${task.status === 'done' ? 'not done' : 'done'}`}
                />
                <div>
                  <p className={`text-base font-medium ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-charcoal'}`}>
                    {task.title}
                  </p>
                  <p className="text-sm text-gray-500">
                    {TASK_TYPE_LABELS[task.taskType]}
                    {task.assigneeId ? ` · ${peopleById.get(task.assigneeId)?.fullName ?? 'Unknown'}` : ' · Unassigned'}
                    {' · Due '}
                    {formatDate(task.dueDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pl-8 sm:pl-0">
                {task.status !== 'done' && <Badge tone={statusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>}
                <button
                  onClick={() => openEdit(task)}
                  className="min-h-[44px] px-2 text-base font-medium text-regal hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(task)}
                  className="min-h-[44px] px-2 text-base font-medium text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit task' : 'Add task'} wide>
        <TaskForm initial={editing} people={people} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
