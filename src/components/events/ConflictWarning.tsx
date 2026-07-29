import { formatTimestamp } from '../../lib/datetime'
import type { VenueConflict } from '../../lib/availability'

export function VenueConflictWarning({ conflicts }: { conflicts: VenueConflict[] }) {
  if (conflicts.length === 0) return null
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-base text-red-800">
      <p className="font-medium">This venue is already booked during that window:</p>
      <ul className="mt-1 list-disc pl-5">
        {conflicts.map((c) => (
          <li key={c.eventId}>
            {c.name} — {formatTimestamp(c.startAt)} to {formatTimestamp(c.endAt)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function InventoryConflictWarning({
  itemName,
  available,
  requestedQty,
  totalQuantity,
}: {
  itemName: string
  available: number
  requestedQty: number
  totalQuantity: number
}) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-base text-red-800">
      Only {Math.max(available, 0)} of {totalQuantity} {itemName} are free for that window — you requested{' '}
      {requestedQty}.
    </div>
  )
}
