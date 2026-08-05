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
import { getTaskTone, TASK_TONE_STRIPE } from '../lib/taskTone'
import type { TaskDoc } from '../types'

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
  const [showCompleted, setShowCompleted] = useState(false)
  const [toggleError, setToggleError] = useState('')

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])

  const filtered = tasks.filter((t) => {
    if (typeFilter && t.taskType !== typeFilter) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })
  const activeTasks = filtered.filter((t) => t.status !== 'done')
  const completedTasks = filtered.filter((t) => t.status === 'done')

  const toggleDone = async (id: string, title: string, status: string) => {
    setToggleError('')
    try {
      await setTaskStatus(id, status === 'done' ? 'todo' : 'done')
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : `Couldn't update "${title}" — try again.`)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-semibold text-charcoal">My tasks</h1>

      <ErrorNotice message={personError || tasksError} />
      <ErrorNotice message={toggleError} />

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
            <div className="flex flex-col gap-4">
              {activeTasks.length === 0 ? (
                <p className="text-base text-gray-500">No active tasks.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {activeTasks.map((task) => (
                    <MyTaskRow
                      key={task.id}
                      task={task}
                      eventName={eventsById.get(task.eventId)?.name}
                      eventId={task.eventId}
                      unreadCount={unreadByTask.get(task.id) ?? 0}
                      onToggleDone={() => toggleDone(task.id, task.title, task.status)}
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
                        <MyTaskRow
                          key={task.id}
                          task={task}
                          eventName={eventsById.get(task.eventId)?.name}
                          eventId={task.eventId}
                          unreadCount={unreadByTask.get(task.id) ?? 0}
                          onToggleDone={() => toggleDone(task.id, task.title, task.status)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MyTaskRow({
  task,
  eventName,
  eventId,
  unreadCount,
  onToggleDone,
}: {
  task: TaskDoc
  eventName: string | undefined
  eventId: string
  unreadCount: number
  onToggleDone: () => void
}) {
  const tone = getTaskTone(task)

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-l-4 border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between ${TASK_TONE_STRIPE[tone]}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'done'}
          onChange={onToggleDone}
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
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1 text-sm font-medium text-white">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {eventName ? (
              <Link to={`/events/${eventId}`} className="hover:underline">
                {eventName}
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
        <Badge tone={statusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
      </div>
    </div>
  )
}
