import { useMemo, useState } from 'react'
import { useReservationsForEvent } from '../../hooks/useReservations'
import { useVendors } from '../../hooks/useVendors'
import { buildPullList } from '../../lib/pullList'
import { exportPullListPdf } from '../../lib/pullListPdf'
import { Button } from '../ui/Button'
import { DropOffCell } from './DropOffCell'
import type { EventDoc, InventoryItem } from '../../types'

interface PullListSectionProps {
  event: EventDoc
  venueName: string
  items: InventoryItem[]
}

export function PullListSection({ event, venueName, items }: PullListSectionProps) {
  const { reservations, loading, updateReservation } = useReservationsForEvent(event.id)
  const { vendors } = useVendors()
  const [editingDropOffs, setEditingDropOffs] = useState(false)

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const vendorsById = useMemo(() => new Map(vendors.map((v) => [v.id, v])), [vendors])

  const groups = useMemo(
    () => buildPullList(reservations, itemsById, vendorsById),
    [reservations, itemsById, vendorsById],
  )

  const totalLines = groups.reduce((sum, g) => sum + g.lines.length, 0)

  return (
    <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-charcoal">Pull list</h2>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={totalLines === 0}
            onClick={() => setEditingDropOffs((v) => !v)}
          >
            {editingDropOffs ? 'Done editing' : 'Edit drop-offs'}
          </Button>
          <Button variant="secondary" disabled={totalLines === 0} onClick={() => exportPullListPdf(event, venueName, groups)}>
            Export PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : totalLines === 0 ? (
        <p className="text-base text-gray-500">No inventory assigned yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.location}>
              <p className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500">{group.location}</p>
              <div className="overflow-x-auto rounded-md border border-gray-200">
                <table className="w-full text-base">
                  <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Qty to pull</th>
                      <th className="px-3 py-2">Bin</th>
                      <th className="px-3 py-2">Drop-off</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.lines.map((line) => (
                      <tr key={line.reservationId}>
                        <td className="px-3 py-2 font-medium text-charcoal">{line.itemName}</td>
                        <td className="px-3 py-2 text-gray-600">{line.quantity}</td>
                        <td className="px-3 py-2 text-gray-600">{line.bin || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {editingDropOffs ? (
                            <DropOffCell
                              value={line.dropOffLocation}
                              onSave={(next) => updateReservation(line.reservationId, { dropOffLocation: next })}
                            />
                          ) : (
                            line.dropOffLocation || '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
