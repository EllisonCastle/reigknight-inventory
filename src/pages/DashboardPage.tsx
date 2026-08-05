import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useVenues } from '../hooks/useVenues'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { useEvents } from '../hooks/useEvents'
import { usePeople } from '../hooks/usePeople'
import { useCurrentPerson } from '../hooks/useCurrentPerson'
import { useTasksForAssignee, useAllTasks } from '../hooks/useTasks'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { formatTimestamp, formatDate } from '../lib/datetime'
import { TASK_STATUS_LABELS } from '../constants/tasks'
import { getTaskTone, TASK_TONE_STRIPE } from '../lib/taskTone'
import { needsAttention } from '../lib/inventoryStatus'
import type { TaskDoc } from '../types'

const taskStatusTone: Record<string, 'neutral' | 'amber' | 'red' | 'green'> = {
  todo: 'neutral',
  in_progress: 'amber',
  blocked: 'red',
  done: 'green',
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function StatTile({ label, value, to }: { label: string; value: number | string; to?: string }) {
  const content = (
    <div className="rounded-lg border border-gray-200 bg-white p-5 transition-colors hover:border-regal">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  )
  return to ? <Link to={to}>{content}</Link> : content
}

function sortByBlockedThenDueDate(tasks: TaskDoc[]): TaskDoc[] {
  return [...tasks].sort((a, b) => {
    const aBlocked = a.status === 'blocked' ? 0 : 1
    const bBlocked = b.status === 'blocked' ? 0 : 1
    if (aBlocked !== bBlocked) return aBlocked - bBlocked
    return (a.dueDate?.toMillis() ?? 0) - (b.dueDate?.toMillis() ?? 0)
  })
}

export function DashboardPage() {
  const { venues } = useVenues()
  const { items } = useInventoryItems()
  const { events } = useEvents()
  const { people } = usePeople()
  const { person } = useCurrentPerson()
  const { tasks: myTasks } = useTasksForAssignee(person?.id)
  const { tasks: allTasks } = useAllTasks()

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events
      .filter((e) => e.status !== 'cancelled' && e.status !== 'completed' && e.endAt.toMillis() >= now)
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())
      .slice(0, 5)
  }, [events])

  const venueName = useMemo(() => {
    const map = new Map(venues.map((v) => [v.id, v.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [venues])

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events])
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const myUpcomingTasks = useMemo(
    () => sortByBlockedThenDueDate(myTasks.filter((t) => t.status !== 'done')).slice(0, 5),
    [myTasks],
  )

  const isAdmin = person?.role === 'admin'
  const adminTasks = useMemo(
    () => sortByBlockedThenDueDate(allTasks.filter((t) => t.status !== 'done')).slice(0, 8),
    [allTasks],
  )

  const needsAttentionCount = useMemo(() => items.filter(needsAttention).length, [items])

  // Admins see every completed task org-wide; anyone with tasks assigned to them sees their own.
  const recentlyCompletedSource = isAdmin ? allTasks : myTasks
  const recentlyCompleted = useMemo(() => {
    const cutoff = Date.now() - THIRTY_DAYS_MS
    return recentlyCompletedSource
      .filter((t) => t.status === 'done' && t.completedAt && t.completedAt.toMillis() >= cutoff)
      .sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0))
  }, [recentlyCompletedSource])
  const [showRecentlyCompleted, setShowRecentlyCompleted] = useState(false)
  const showRecentlyCompletedSection = isAdmin || myTasks.length > 0

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-xl font-semibold text-charcoal">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Venues" value={venues.length} to="/venues" />
        <StatTile label="Inventory items" value={items.length} to="/inventory" />
        <StatTile label="Upcoming events" value={upcoming.length} to="/events" />
        {isAdmin && (
          <StatTile label="Items needing attention" value={needsAttentionCount} to="/inventory?attention=1" />
        )}
      </div>

      <h2 className="mb-3 text-lg font-semibold text-charcoal">Next up</h2>
      {upcoming.length === 0 ? (
        <p className="mb-8 text-base text-gray-500">Nothing on the calendar right now.</p>
      ) : (
        <div className="mb-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-base">
            <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Venue</th>
                <th className="px-4 py-2.5">Start</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {upcoming.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">
                    <Link to={`/events/${event.id}`} className="hover:underline">
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{venueName(event.venueId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatTimestamp(event.startAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-charcoal">My tasks</h2>
        <Link to="/my-tasks" className="text-base font-medium text-regal hover:underline">
          View all
        </Link>
      </div>
      {myUpcomingTasks.length === 0 ? (
        <p className="mb-8 text-base text-gray-500">Nothing assigned to you right now.</p>
      ) : (
        <div className="mb-8 flex flex-col gap-2">
          {myUpcomingTasks.map((task) => {
            const event = eventsById.get(task.eventId)
            return (
              <div
                key={task.id}
                className={`flex items-center justify-between rounded-lg border border-l-4 border-gray-200 bg-white p-3 ${TASK_TONE_STRIPE[getTaskTone(task)]}`}
              >
                <div>
                  <p className="text-base font-medium text-charcoal">{task.title}</p>
                  <p className="text-sm text-gray-500">
                    {event ? (
                      <Link to={`/events/${event.id}`} className="hover:underline">
                        {event.name}
                      </Link>
                    ) : (
                      'Unknown event'
                    )}
                    {' · Due '}
                    {formatDate(task.dueDate)}
                  </p>
                </div>
                <Badge tone={taskStatusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
              </div>
            )
          })}
        </div>
      )}

      {isAdmin && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-charcoal">All upcoming &amp; in-progress tasks</h2>
          {adminTasks.length === 0 ? (
            <p className="text-base text-gray-500">No open tasks anywhere right now.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {adminTasks.map((task) => {
                const event = eventsById.get(task.eventId)
                const assigneeNames = task.assigneeIds
                  .map((id) => peopleById.get(id)?.fullName)
                  .filter((name): name is string => Boolean(name))
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between rounded-lg border border-l-4 border-gray-200 bg-white p-3 ${TASK_TONE_STRIPE[getTaskTone(task)]}`}
                  >
                    <div>
                      <p className="text-base font-medium text-charcoal">{task.title}</p>
                      <p className="text-sm text-gray-500">
                        {event ? (
                          <Link to={`/events/${event.id}`} className="hover:underline">
                            {event.name}
                          </Link>
                        ) : (
                          'Unknown event'
                        )}
                        {' · '}
                        {assigneeNames.length > 0 ? assigneeNames.join(', ') : 'Unassigned'}
                        {' · Due '}
                        {formatDate(task.dueDate)}
                      </p>
                    </div>
                    <Badge tone={taskStatusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {showRecentlyCompletedSection && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowRecentlyCompleted((v) => !v)}
            className="min-h-[44px] text-base font-medium text-gray-500 hover:text-charcoal"
          >
            {showRecentlyCompleted ? '▾' : '▸'} Recently completed tasks ({recentlyCompleted.length})
          </button>
          {showRecentlyCompleted && (
            <div className="mt-2 flex flex-col gap-2">
              {recentlyCompleted.length === 0 ? (
                <p className="text-base text-gray-500">Nothing completed in the last 30 days.</p>
              ) : (
                recentlyCompleted.map((task) => {
                  const event = eventsById.get(task.eventId)
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between rounded-lg border border-l-4 border-gray-200 bg-white p-3 ${TASK_TONE_STRIPE.done}`}
                    >
                      <div>
                        <p className="text-base font-medium text-charcoal">{task.title}</p>
                        <p className="text-sm text-gray-500">
                          {event ? (
                            <Link to={`/events/${event.id}`} className="hover:underline">
                              {event.name}
                            </Link>
                          ) : (
                            'Unknown event'
                          )}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">Completed {formatDate(task.completedAt)}</p>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
