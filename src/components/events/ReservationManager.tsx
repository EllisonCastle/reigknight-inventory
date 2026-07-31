import { useState, type FormEvent } from 'react'
import { useReservationsForEvent } from '../../hooks/useReservations'
import { checkInventoryAvailability, type InventoryAvailability } from '../../lib/availability'
import { availableForRental, getItemTotalQuantity } from '../../lib/inventoryStatus'
import { getBinRoundingPackSize, getCommittedQuantity, getInvoicedQuantity, suggestCommittedQuantity } from '../../lib/reservationQuantity'
import { localInputToTimestamp, timestampToLocalInput, formatTimestamp } from '../../lib/datetime'
import { Button } from '../ui/Button'
import { FormRow, Input, Select } from '../ui/Field'
import { InventoryConflictWarning } from './ConflictWarning'
import { DropOffCell } from './DropOffCell'
import { QuantityCell } from './QuantityCell'
import { ErrorNotice } from '../ui/ErrorNotice'
import type { EventDoc, InventoryItem, Reservation } from '../../types'

interface ReservationManagerProps {
  event: EventDoc
  items: InventoryItem[]
}

export function ReservationManager({ event, items }: ReservationManagerProps) {
  const {
    reservations,
    loading,
    error: loadError,
    createReservation,
    updateReservation,
    deleteReservation,
  } = useReservationsForEvent(event.id)

  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const [quantityInvoiced, setQuantityInvoiced] = useState('1')
  const [quantityCommitted, setQuantityCommitted] = useState('1')
  const [committedTouched, setCommittedTouched] = useState(false)
  const [reservedFrom, setReservedFrom] = useState(timestampToLocalInput(event.startAt))
  const [reservedTo, setReservedTo] = useState(timestampToLocalInput(event.endAt))
  const [dropOffLocation, setDropOffLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState<InventoryAvailability | null>(null)

  const itemById = new Map(items.map((i) => [i.id, i]))
  const selectedItem = itemById.get(itemId)

  const handleItemChange = (nextId: string) => {
    setItemId(nextId)
    setCommittedTouched(false)
    const item = itemById.get(nextId)
    if (item) {
      setQuantityCommitted(String(suggestCommittedQuantity(item, Number(quantityInvoiced) || 0)))
    }
  }

  const handleInvoicedChange = (raw: string) => {
    setQuantityInvoiced(raw)
    if (!committedTouched && selectedItem) {
      setQuantityCommitted(String(suggestCommittedQuantity(selectedItem, Number(raw) || 0)))
    }
  }

  const handleCommittedChange = (raw: string) => {
    setCommittedTouched(true)
    setQuantityCommitted(raw)
  }

  const invoicedNum = Number(quantityInvoiced) || 0
  const committedNum = Number(quantityCommitted) || 0
  const spare = committedNum - invoicedNum
  const packSize = selectedItem ? getBinRoundingPackSize(selectedItem) : null
  const bins = packSize ? Math.ceil(committedNum / packSize) : null

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setConflict(null)

    const item = itemById.get(itemId)
    if (!item) {
      setError('Select an item.')
      return
    }
    if (!invoicedNum || invoicedNum <= 0) {
      setError('Invoiced quantity must be a positive number.')
      return
    }
    if (!committedNum || committedNum <= 0) {
      setError('Committed quantity must be a positive number.')
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
      const availability = await checkInventoryAvailability(itemId, getItemTotalQuantity(item), ceiling, fromTs, toTs, committedNum)
      if (!availability.isAvailable) {
        setConflict(availability)
        return
      }
      await createReservation({
        eventId: event.id,
        itemId,
        quantityInvoiced: invoicedNum,
        quantityCommitted: committedNum,
        reservedFrom: fromTs,
        reservedTo: toTs,
        eventStatus: event.status,
        dropOffLocation: dropOffLocation.trim(),
      })
      setQuantityInvoiced('1')
      setQuantityCommitted('1')
      setCommittedTouched(false)
      setDropOffLocation('')
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

  const handleSaveInvoiced = async (r: Reservation, next: number) => {
    await updateReservation(r.id, { quantityInvoiced: next })
  }

  const handleSaveCommitted = async (r: Reservation, next: number) => {
    const item = itemById.get(r.itemId)
    if (!item) {
      await updateReservation(r.id, { quantityCommitted: next })
      return
    }
    const ceiling = availableForRental(item)
    const availability = await checkInventoryAvailability(
      r.itemId,
      getItemTotalQuantity(item),
      ceiling,
      r.reservedFrom,
      r.reservedTo,
      next,
      r.id,
    )
    if (!availability.isAvailable) {
      throw new Error(`Only ${Math.max(availability.available, 0)} of ${availability.totalQuantity} available for that window.`)
    }
    await updateReservation(r.id, { quantityCommitted: next })
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
                <th className="py-1.5">Invoiced</th>
                <th className="py-1.5">Committed</th>
                <th className="py-1.5">From</th>
                <th className="py-1.5">To</th>
                <th className="py-1.5">Drop-off</th>
                <th className="py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td className="py-1.5 font-medium text-charcoal">{itemById.get(r.itemId)?.name ?? '(deleted item)'}</td>
                  <td className="py-1.5 text-gray-600">
                    <QuantityCell value={getInvoicedQuantity(r)} onSave={(next) => handleSaveInvoiced(r, next)} />
                  </td>
                  <td className="py-1.5 text-gray-600">
                    <QuantityCell value={getCommittedQuantity(r)} onSave={(next) => handleSaveCommitted(r, next)} />
                  </td>
                  <td className="py-1.5 text-sm text-gray-600">{formatTimestamp(r.reservedFrom)}</td>
                  <td className="py-1.5 text-sm text-gray-600">{formatTimestamp(r.reservedTo)}</td>
                  <td className="py-1.5">
                    <DropOffCell value={r.dropOffLocation ?? ''} onSave={(next) => updateReservation(r.id, { dropOffLocation: next })} />
                  </td>
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
          <Select value={itemId} onChange={(e) => handleItemChange(e.target.value)}>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} — {availableForRental(i)} available
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="Quantity invoiced (customer pays)">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantityInvoiced}
            onChange={(e) => handleInvoicedChange(e.target.value)}
          />
        </FormRow>
        <FormRow label="Quantity committed (blocks inventory)">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={quantityCommitted}
            onChange={(e) => handleCommittedChange(e.target.value)}
          />
        </FormRow>
        <FormRow label="From">
          <Input type="datetime-local" value={reservedFrom} onChange={(e) => setReservedFrom(e.target.value)} />
        </FormRow>
        <FormRow label="To">
          <Input type="datetime-local" value={reservedTo} onChange={(e) => setReservedTo(e.target.value)} />
        </FormRow>
        <FormRow label="Drop-off location (optional)">
          <Input
            value={dropOffLocation}
            onChange={(e) => setDropOffLocation(e.target.value)}
            placeholder="Main Stage, Kitchen area…"
          />
        </FormRow>

        <div className="sm:col-span-2 md:col-span-4">
          {(invoicedNum > 0 || committedNum > 0) && (
            <p className="text-sm text-gray-500">
              {invoicedNum} rented{bins != null ? ` · ${bins} bin${bins === 1 ? '' : 's'}` : ''} / {committedNum} committed
              {spare !== 0 ? ` · ${Math.max(spare, 0)} spare` : ''}
            </p>
          )}
        </div>

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
