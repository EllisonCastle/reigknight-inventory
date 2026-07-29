import type { Timestamp } from 'firebase/firestore'
import { Badge } from '../ui/Badge'
import { formatTimestamp } from '../../lib/datetime'
import type { AgendaItemDoc, Person, VendorDoc } from '../../types'

interface AgendaTimelineProps {
  items: AgendaItemDoc[]
  peopleById: Map<string, Person>
  vendorsById: Map<string, VendorDoc>
  showGuestBadge: boolean
  /** true (default): hour-grouped working timeline. false: a flat chronological list (used for the Guest tab). */
  grouped?: boolean
  onEdit: (item: AgendaItemDoc) => void
  onDelete: (item: AgendaItemDoc) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

function hourBucketKey(ts: Timestamp): string {
  const d = ts.toDate()
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`
}

function hourBucketLabel(ts: Timestamp, includeDate: boolean): string {
  const d = ts.toDate()
  const hourStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours())
  const time = hourStart.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (!includeDate) return time
  return `${hourStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${time}`
}

function assigneeLabel(item: AgendaItemDoc, peopleById: Map<string, Person>, vendorsById: Map<string, VendorDoc>): string {
  if (item.assigneeType === 'person' && item.assigneePersonId) {
    return peopleById.get(item.assigneePersonId)?.fullName ?? 'Unknown person'
  }
  if (item.assigneeType === 'vendor' && item.assigneeVendorId) {
    const vendor = vendorsById.get(item.assigneeVendorId)
    return vendor ? `${vendor.name} (vendor)` : 'Unknown vendor'
  }
  return 'Unassigned'
}

export function AgendaTimeline({
  items,
  peopleById,
  vendorsById,
  showGuestBadge,
  grouped = true,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: AgendaTimelineProps) {
  if (items.length === 0) {
    return <p className="text-base text-gray-500">No items yet.</p>
  }

  const spansMultipleDays =
    new Set(items.map((i) => i.startAt.toDate().toDateString())).size > 1

  const groups: { key: string; label: string | null; items: AgendaItemDoc[] }[] = grouped
    ? []
    : [{ key: 'all', label: null, items }]
  if (grouped) {
    for (const item of items) {
      const key = hourBucketKey(item.startAt)
      const last = groups[groups.length - 1]
      if (last && last.key === key) {
        last.items.push(item)
      } else {
        groups.push({ key, label: hourBucketLabel(item.startAt, spansMultipleDays), items: [item] })
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.key}>
          {group.label && <p className="mb-2 text-sm font-medium uppercase tracking-wide text-gray-500">{group.label}</p>}
          <div className="flex flex-col gap-2">
            {group.items.map((item) => {
              const siblings = items.filter((i) => i.startAt.toMillis() === item.startAt.toMillis())
              const siblingIndex = siblings.findIndex((i) => i.id === item.id)
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-medium text-charcoal">{item.title}</p>
                      {showGuestBadge && item.isPublic && <Badge tone="regal">Guest</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">
                      {formatTimestamp(item.startAt)}
                      {item.endAt ? ` – ${formatTimestamp(item.endAt)}` : ''}
                      {item.location ? ` · ${item.location}` : ''}
                    </p>
                    <p className="text-sm text-gray-600">{assigneeLabel(item, peopleById, vendorsById)}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <button
                        onClick={() => onEdit(item)}
                        className="min-h-[44px] px-1 text-sm font-medium text-regal hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="min-h-[44px] px-1 text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      onClick={() => onMoveUp(item.id)}
                      disabled={siblingIndex === 0}
                      aria-label={`Move "${item.title}" earlier`}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-surface text-regal disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => onMoveDown(item.id)}
                      disabled={siblingIndex === siblings.length - 1}
                      aria-label={`Move "${item.title}" later`}
                      className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-surface text-regal disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
