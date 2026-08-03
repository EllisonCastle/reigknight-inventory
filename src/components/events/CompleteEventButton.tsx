import { useState } from 'react'
import { useReservationsForEvent } from '../../hooks/useReservations'
import { getCommittedQuantity } from '../../lib/reservationQuantity'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import type { EventDoc, InventoryItem } from '../../types'

interface CompleteEventButtonProps {
  event: EventDoc
  items: InventoryItem[]
  onComplete: () => Promise<void>
}

interface ReturnLine {
  itemId: string
  name: string
  committed: number
}

/** "Complete Event & Return Inventory" — flips the event to completed and, via the existing eventStatus sync, immediately frees every reservation's committed quantity (including auto-generated kit-component reservations, since they share the same eventId). Shows what's being returned before committing. */
export function CompleteEventButton({ event, items, onComplete }: CompleteEventButtonProps) {
  const { reservations } = useReservationsForEvent(event.id)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  if (event.status === 'completed' || event.status === 'cancelled') return null

  const itemsById = new Map(items.map((i) => [i.id, i]))

  const totals = new Map<string, number>()
  for (const r of reservations) {
    if (r.eventStatus === 'cancelled') continue
    const committed = getCommittedQuantity(r)
    if (committed <= 0) continue
    totals.set(r.itemId, (totals.get(r.itemId) ?? 0) + committed)
  }
  const summary: ReturnLine[] = [...totals.entries()]
    .map(([itemId, committed]) => ({ itemId, name: itemsById.get(itemId)?.name ?? '(deleted item)', committed }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onComplete()
      setOpen(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Complete Event & Return Inventory
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="Complete event & return inventory">
        <div className="flex flex-col gap-4">
          <p className="text-base text-gray-600">
            This marks the event completed and immediately releases every committed quantity below back to
            available — including anything pulled in as a kit component.
          </p>

          {summary.length === 0 ? (
            <p className="text-base text-gray-500">Nothing committed to return.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-base">
                <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Qty returned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {summary.map((line) => (
                    <tr key={line.itemId}>
                      <td className="px-3 py-2 text-charcoal">{line.name}</td>
                      <td className="px-3 py-2 text-gray-600">{line.committed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={saving}>
              {saving ? 'Completing…' : 'Complete & return'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
