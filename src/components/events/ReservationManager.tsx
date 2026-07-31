import { useState, type FormEvent } from 'react'
import { useReservationsForEvent } from '../../hooks/useReservations'
import { checkInventoryAvailability, type InventoryAvailability } from '../../lib/availability'
import { availableForRental } from '../../lib/inventoryStatus'
import { localInputToTimestamp, timestampToLocalInput, formatTimestamp } from '../../lib/datetime'
import { Button } from '../ui/Button'
import { FormRow, Input, Select } from '../ui/Field'
import { InventoryConflictWarning } from './ConflictWarning'
import { ErrorNotice } from '../ui/ErrorNotice'
import type { EventDoc, InventoryItem } from '../../types'

interface ReservationManagerProps {
  event: EventDoc
  items: InventoryItem[]
}

export function ReservationManager({ event, items }: ReservationManagerProps) {
  const { reservations, loading, error: loadError, createReservation, deleteReservation } = useReservationsForEvent(
    event.id,
  )

  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const [quantity, setQuantity] = useState('1')
  const [reservedFrom, setReservedFrom] = useState(timestampToLocalInput(event.startAt))
  const [reservedTo, setReservedTo] = useState(timestampToLocalInput(event.endAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState<InventoryAvailability | null>(null)

  const itemById = new Map(items.map((i) => [i.id, i]))

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setConflict(null)

    const item = itemById.get(itemId)
    const qty = Number(quantity)
    if (!item) {
      setError('Select an item.')
      return
    }
    if (!qty || qty <= 0) {
      setError('Quantity must be a positive number.')
      return
    }
    if (!reservedFrom || !reservedTo) {
      setError('From and to are required.')
      return
    }

    const fromTs = localInputToTimestamp(reservedFrom)
    const toTs = localInputToTimestamp(reservedTo)
    if (fromTs.toMillis() >= toTs.toMillis()) {
      setError('End must be after start.')
      return
    }

    setSaving(true)
    try {
      const ceiling = availableForRental(item)
      const availability = await checkInventoryAvailability(itemId, item.totalQuantity, ceiling, fromTs, toTs, qty)
      if (!availability.isAvailable) {
        setConflict(availability)
        return
      }
      await createReservation({
        eventId: event.id,
        itemId,
        quantity: qty,
        reservedFrom: fromTs,
        reservedTo: toTs,
        eventStatus: event.status,
      })
      setQuantity('1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this inventory assignment?')) return
    await deleteReservation(id)
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold text-charcoal">Assigned inventory</h2>

      <ErrorNotice message={loadError} />

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : reservations.length === 0 ? (
        <p className="mb-4 text-base text-gray-500">Nothing assigned yet.</p>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-base">
            <thead className="text-left text-sm font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="py-1.5">Item</th>
                <th className="py-1.5">Qty</th>
                <th className="py-1.5">From</th>
                <th className="py-1.5">To</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td className="py-1.5 font-medium text-charcoal">{itemById.get(r.itemId)?.name ?? '(deleted item)'}</td>
                  <td className="py-1.5 text-gray-600">{r.quantity}</td>
                  <td className="py-1.5 text-sm text-gray-600">{formatTimestamp(r.reservedFrom)}</td>
                  <td className="py-1.5 text-sm text-gray-600">{formatTimestamp(r.reservedTo)}</td>
                  <td className="py-1.5 text-right">
                    <button
                      onClick={() => handleRemove(r.id)}
                      className="min-h-[44px] px-2 text-base font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-4 sm:grid-cols-2 md:grid-cols-4">
        <FormRow label="Item">
          <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — {availableForRental(i)} available
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Quantity">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormRow>
        <FormRow label="From">
          <Input type="datetime-local" value={reservedFrom} onChange={(e) => setReservedFrom(e.target.value)} />
        </FormRow>
        <FormRow label="To">
          <Input type="datetime-local" value={reservedTo} onChange={(e) => setReservedTo(e.target.value)} />
        </FormRow>

        <div className="sm:col-span-2 md:col-span-4">
          {conflict && itemById.get(itemId) && (
            <InventoryConflictWarning
              itemName={itemById.get(itemId)!.name}
              available={conflict.available}
              requestedQty={conflict.requestedQty}
              totalQuantity={conflict.totalQuantity}
            />
          )}
          {error && <p className="text-base text-red-600">{error}</p>}
        </div>

        <div className="sm:col-span-2 md:col-span-4">
          <Button type="submit" disabled={saving || items.length === 0} className="min-h-[44px] w-full sm:w-auto">
            {saving ? 'Checking…' : '+ Assign inventory'}
          </Button>
        </div>
      </form>
    </div>
  )
}
