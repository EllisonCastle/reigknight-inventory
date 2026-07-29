import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { formatTimestamp, formatDate } from '../lib/datetime'
import { TASK_TYPE_LABELS, TASK_STATUS_LABELS } from '../constants/tasks'
import {
  computeTaskProgress,
  groupOutstandingByPerson,
  groupOutstandingByType,
  outstandingTasks,
  sortByBlockedThenDueDate,
} from '../lib/eventProgress'
import type { PublicViewSnapshot } from '../types'

const taskStatusTone: Record<string, 'neutral' | 'amber' | 'red' | 'green'> = {
  todo: 'neutral',
  in_progress: 'amber',
  blocked: 'red',
  done: 'green',
}

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  )
}

/** Read-only, no-login progress view for one event — reads publicViews/{shareToken} directly. */
export function PublicEventPage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  // undefined = loading, null = not found / link invalid
  const [snapshot, setSnapshot] = useState<PublicViewSnapshot | null | undefined>(undefined)

  useEffect(() => {
    if (!shareToken) {
      setSnapshot(null)
      return
    }
    let cancelled = false
    getDoc(doc(db, 'publicViews', shareToken))
      .then((snap) => {
        if (cancelled) return
        setSnapshot(snap.exists() ? (snap.data() as PublicViewSnapshot) : null)
      })
      .catch(() => {
        if (cancelled) return
        setSnapshot(null)
      })
    return () => {
      cancelled = true
    }
  }, [shareToken])

  if (snapshot === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <p className="text-base text-gray-500">Loading…</p>
      </div>
    )
  }

  if (snapshot === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <p className="text-base text-gray-500">This link is no longer valid.</p>
      </div>
    )
  }

  const progress = computeTaskProgress(snapshot.tasks)
  const outstanding = sortByBlockedThenDueDate(outstandingTasks(snapshot.tasks))
  const byPerson = groupOutstandingByPerson(outstanding)
  const byType = groupOutstandingByType(outstanding)

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-charcoal">{snapshot.event.name}</h1>
          <p className="mt-1 text-base text-gray-600">
            {snapshot.event.venueName} · {formatTimestamp(snapshot.event.startAt)} – {formatTimestamp(snapshot.event.endAt)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={snapshot.event.status} />
            {snapshot.event.clientName && <span className="text-sm text-gray-500">Client: {snapshot.event.clientName}</span>}
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile label="Tasks done" value={`${progress.done} / ${progress.total}`} />
          <StatTile label="% complete" value={`${progress.percentDone}%`} />
          <StatTile label="Assigned inventory" value={snapshot.inventory.length} />
        </div>

        <h2 className="mb-3 text-lg font-semibold text-charcoal">Outstanding items</h2>
        {outstanding.length === 0 ? (
          <p className="mb-8 text-base text-gray-500">Nothing outstanding — all tasks are done.</p>
        ) : (
          <div className="mb-8 flex flex-col gap-2">
            {outstanding.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3">
                <div>
                  <p className="text-base font-medium text-charcoal">{task.title}</p>
                  <p className="text-sm text-gray-500">
                    {TASK_TYPE_LABELS[task.taskType]}
                    {' · '}
                    {task.assigneeNames.length > 0 ? task.assigneeNames.join(', ') : 'Unassigned'}
                    {' · Due '}
                    {formatDate(task.dueDate)}
                  </p>
                </div>
                <Badge tone={taskStatusTone[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
              </div>
            ))}
          </div>
        )}

        {outstanding.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-base font-semibold text-charcoal">Outstanding by person</h3>
              <ul className="flex flex-col gap-1 text-sm text-gray-600">
                {byPerson.map((group) => (
                  <li key={group.key}>
                    <span className="font-medium text-charcoal">{group.key}</span> — {group.tasks.length}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-base font-semibold text-charcoal">Outstanding by type</h3>
              <ul className="flex flex-col gap-1 text-sm text-gray-600">
                {byType.map((group) => (
                  <li key={group.key}>
                    <span className="font-medium text-charcoal">{TASK_TYPE_LABELS[group.key]}</span> — {group.tasks.length}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <h2 className="mb-3 text-lg font-semibold text-charcoal">Assigned inventory</h2>
        {snapshot.inventory.length === 0 ? (
          <p className="text-base text-gray-500">Nothing assigned yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {snapshot.inventory.map((item, index) => (
              <div key={`${item.itemId}-${index}`} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
                {item.primaryPhotoUrl ? (
                  <img src={item.primaryPhotoUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded-md bg-surface" />
                )}
                <div>
                  <p className="text-base font-medium text-charcoal">{item.itemName}</p>
                  <p className="text-sm text-gray-500">Qty {item.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
