import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentPerson } from '../hooks/useCurrentPerson'
import { useEvents } from '../hooks/useEvents'
import { useTasksForAssignee } from '../hooks/useTasks'
import { useUnreadTaskMessages } from '../hooks/useUnreadTaskMessages'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Field'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_TYPES } from '../constants/tasks'
import { formatDate } from '../lib/datetime'

const statusTone: Record<string, 'neutral' | 'amber' | 'red' | 'green'> = {
  todo: 'neutral',
  in_progress: 'amber',
  blocked: 'red',
  done: 'green',
}

export function MyTasksPage() {
  const { person, loading: personLoading, error: personError } = useCurrentPerson()
  const { events } = useEvents()
  const { tasks, loading: tasksLoading, error: tasksError, setTaskStatus } = useTasksForAssignee(person?.id)
  const { unreadByTask } = useUnreadTaskMessages()

  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])

  const filtered = tasks.filter((t) => {
    if (typeFilter && t.taskType !== typeFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  const toggleDone = (id: string, status: string) => {
    setTaskStatus(id, status === 'done' ? 'todo' : 'done')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-charcoal">My tasks</h1>

      <ErrorNotice message={personError || tasksError} />

      {personLoading ? (
        <p className="text-base text-gray-500">Setting up your tasks…</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>

          {tasksLoading ? (
            <p className="text-base text-gray-500">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-base text-gray-500">No tasks assigned to you right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((task) => {
                const event = eventsById.get(task.eventId)
                return (
                  <div
                    key={task.id}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'done'}
                        onChange={() => toggleDone(task.id, task.status)}
                        className="mt-1 h-5 w-5 shrink-0"
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
                          {(unreadByTask.get(task.id) ?? 0) > 0 && (
                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-sm font-medium text-white">
                              {unreadByTask.get(task.id)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {event ? (
                            <Link to={`/events/${event.id}`} className="hover:underline">
                              {event.name}
                            </Link>
                          ) : (
                            'Unknown event'
                          )}
                          {' · '}
                          {TASK_TYPE_LABELS[task.taskType]}
                          {' · Due '}
                          {formatDate(task.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="pl-8 sm:pl-0">
                      {task.status !== 'done' && <Badge tone={statusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
