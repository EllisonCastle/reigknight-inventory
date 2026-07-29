import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { usePeople } from '../hooks/usePeople'
import { useEvents } from '../hooks/useEvents'
import { useTasksForAssignee } from '../hooks/useTasks'
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
  const { user } = useAuth()
  const { people, loading: peopleLoading, createPerson, updatePerson } = usePeople()
  const { events } = useEvents()
  const [personId, setPersonId] = useState<string | undefined>(undefined)
  const [provisioning, setProvisioning] = useState(true)
  const [provisionError, setProvisionError] = useState('')
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (peopleLoading || !user || hasRunRef.current) return
    hasRunRef.current = true

    const byAuthUid = people.find((p) => p.authUid === user.uid)
    if (byAuthUid) {
      setPersonId(byAuthUid.id)
      setProvisioning(false)
      return
    }

    const byEmail = people.find(
      (p) => !p.authUid && p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase(),
    )

    ;(async () => {
      try {
        if (byEmail) {
          await updatePerson(byEmail.id, { authUid: user.uid })
          setPersonId(byEmail.id)
        } else {
          const ref = await createPerson({
            fullName: user.email ?? 'Team member',
            email: user.email ?? '',
            phone: '',
            role: 'staff',
            authUid: user.uid,
            active: true,
          })
          setPersonId(ref.id)
        }
      } catch (err) {
        setProvisionError(err instanceof Error ? err.message : 'Could not set up your tasks profile.')
      } finally {
        setProvisioning(false)
      }
    })()
  }, [peopleLoading, people, user, createPerson, updatePerson])

  const { tasks, loading: tasksLoading, error: tasksError, setTaskStatus } = useTasksForAssignee(personId)

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

      <ErrorNotice message={provisionError || tasksError} />

      {(provisioning || peopleLoading) ? (
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
                        <p className={`text-base font-medium ${task.status === 'done' ? 'text-gray-400 line-through' : 'text-charcoal'}`}>
                          {task.title}
                        </p>
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
