import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAllTasks, useTasksForEvent } from '../hooks/useTasks'
import { useEvents } from '../hooks/useEvents'
import { usePeople } from '../hooks/usePeople'
import { usePermissions } from '../hooks/usePermissions'
import { TaskForm, type TaskFormValues } from '../components/tasks/TaskForm'
import { DiscussionSection } from '../components/tasks/DiscussionSection'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS } from '../constants/tasks'
import { formatDate } from '../lib/datetime'

const statusTone: Record<string, 'neutral' | 'amber' | 'red' | 'green'> = {
  todo: 'neutral',
  in_progress: 'amber',
  blocked: 'red',
  done: 'green',
}

export function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const { tasks, loading } = useAllTasks()
  const { events } = useEvents()
  const { people } = usePeople()
  const { isAdmin, isAdminOrStaff } = usePermissions()
  const [editOpen, setEditOpen] = useState(false)

  const task = tasks.find((t) => t.id === taskId)
  const { updateTask } = useTasksForEvent(task?.eventId)
  const event = events.find((e) => e.id === task?.eventId)
  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people])

  const handleSubmit = async (values: TaskFormValues) => {
    if (!task) return
    await updateTask(task.id, values)
    setEditOpen(false)
  }

  if (loading) return <p className="text-base text-gray-500">Loading…</p>
  if (!task) {
    return (
      <div>
        <p className="text-base text-gray-500">Task not found.</p>
        <Link to="/events" className="text-base font-medium text-regal hover:underline">
          Back to events
        </Link>
      </div>
    )
  }

  const assigneeNames = task.assigneeIds.map((id) => peopleById.get(id)?.fullName ?? 'Unknown')

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={event ? `/events/${event.id}` : '/events'} className="text-base text-gray-500 hover:underline">
        ← {event ? event.name : 'Events'}
      </Link>

      <div className="mb-4 mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">{task.title}</h1>
          <p className="mt-1 text-base text-gray-600">
            {TASK_TYPE_LABELS[task.taskType]} · Due {formatDate(task.dueDate)}
          </p>
          <div className="mt-2">
            <Badge tone={statusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
          </div>
        </div>
        {isAdmin && (
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Edit task
          </Button>
        )}
      </div>

      {task.description && <p className="mb-4 whitespace-pre-wrap text-base text-gray-600">{task.description}</p>}

      <div className="mb-4">
        <p className="text-sm text-gray-500">Assignees</p>
        <p className="text-base text-charcoal">{assigneeNames.length > 0 ? assigneeNames.join(', ') : 'Unassigned'}</p>
      </div>

      {isAdminOrStaff && <DiscussionSection taskId={task.id} eventId={task.eventId} people={people} />}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit task" wide>
        <TaskForm initial={task} people={people} onCancel={() => setEditOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
