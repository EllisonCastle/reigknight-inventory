import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTasksForEvent } from '../../hooks/useTasks'
import { usePermissions } from '../../hooks/usePermissions'
import { useUnreadTaskMessages } from '../../hooks/useUnreadTaskMessages'
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
  const { isAdmin, canEditTaskStatus } = usePermissions()
  const { unreadByTask } = useUnreadTaskMessages()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TaskDoc | undefined>(undefined)
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assigneeFilter, setAssigneeFilter] = useState('')
  const [showCompleted, setShowCompleted] = useState(false)
  const [toggleError, setToggleError] = useState('')

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const eventUnreadTotal = useMemo(
    () => tasks.reduce((sum, t) => sum + (unreadByTask.get(t.id) ?? 0), 0),
    [tasks, unreadByTask],
  )

  const filtered = tasks.filter((t) => {
    if (typeFilter && t.taskType !== typeFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    if (assigneeFilter && !t.assigneeIds.includes(assigneeFilter)) return false
    return true
  })
  const activeTasks = filtered.filter((t) => t.status !== 'done')
  const completedTasks = filtered.filter((t) => t.status === 'done')

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

  const toggleDone = async (task: TaskDoc) => {
    setToggleError('')
    try {
      await setTaskStatus(task.id, task.status === 'done' ? 'todo' : 'done')
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : `Couldn't update "${task.title}" — try again.`)
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-charcoal">Tasks</h2>
          {eventUnreadTotal > 0 && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-sm font-medium text-red-700">
              {eventUnreadTotal} unread task message{eventUnreadTotal === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <span title={isAdmin ? undefined : 'Admin only'}>
          <Button onClick={openCreate} disabled={!isAdmin}>+ Add task</Button>
        </span>
      </div>

      <ErrorNotice message={error} />
      <ErrorNotice message={toggleError} />

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
        <div className="flex flex-col gap-4">
          {activeTasks.length === 0 ? (
            <p className="text-base text-gray-500">No active tasks.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  peopleById={peopleById}
                  unreadCount={unreadByTask.get(task.id) ?? 0}
                  canEdit={canEditTaskStatus(task.assigneeIds)}
                  isAdmin={isAdmin}
                  onToggleDone={() => toggleDone(task)}
                  onEdit={() => openEdit(task)}
                  onDelete={() => handleDelete(task)}
                />
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className="min-h-[44px] text-base font-medium text-gray-500 hover:text-charcoal"
              >
                {showCompleted ? '▾' : '▸'} Completed ({completedTasks.length})
              </button>
              {showCompleted && (
                <div className="mt-2 flex flex-col gap-2">
                  {completedTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      peopleById={peopleById}
                      unreadCount={unreadByTask.get(task.id) ?? 0}
                      canEdit={canEditTaskStatus(task.assigneeIds)}
                      isAdmin={isAdmin}
                      onToggleDone={() => toggleDone(task)}
                      onEdit={() => openEdit(task)}
                      onDelete={() => handleDelete(task)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit task' : 'Add task'} wide>
        <TaskForm initial={editing} people={people} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}

function TaskRow({
  task,
  peopleById,
  unreadCount,
  canEdit,
  isAdmin,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  task: TaskDoc
  peopleById: Map<string, Person>
  unreadCount: number
  canEdit: boolean
  isAdmin: boolean
  onToggleDone: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={onToggleDone}
          disabled={!canEdit}
          title={canEdit ? undefined : 'Only assigned team members can update this'}
          className="mt-1 h-5 w-5 shrink-0 disabled:opacity-40"
          aria-label={`Mark "${task.title}" ${task.status === 'done' ? 'not done' : 'done'}`}
        />
        <div>
          <div className="flex items-center gap-1.5">
            <Link
              to={`/tasks/${task.id}`}
              className={`text-base font-medium hover:underline ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-charcoal'}`}
            >
              {task.title}
            </Link>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-sm font-medium text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {TASK_TYPE_LABELS[task.taskType]}
            {task.assigneeIds.length > 0
              ? ` · ${task.assigneeIds.map((id) => peopleById.get(id)?.fullName ?? 'Unknown').join(', ')}`
              : ' · Unassigned'}
            {' · Due '}
            {formatDate(task.dueDate)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-8 sm:pl-0">
        {task.status !== 'done' && <Badge tone={statusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>}
        <button
          onClick={onEdit}
          disabled={!isAdmin}
          title={isAdmin ? undefined : 'Admin only'}
          className="min-h-[44px] px-2 text-base font-medium text-regal hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          disabled={!isAdmin}
          title={isAdmin ? undefined : 'Admin only'}
          className="min-h-[44px] px-2 text-base font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
        >
          Delete
        </button>
      </div>
    </div>
  )
}
