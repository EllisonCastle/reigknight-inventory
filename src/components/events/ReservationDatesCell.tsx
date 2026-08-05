import { useState } from 'react'
import type { Timestamp } from 'firebase/firestore'
import { localInputToTimestamp, timestampToLocalInput, formatTimestamp } from '../../lib/datetime'

interface ReservationDatesCellProps {
  eventFrom: Timestamp
  eventTo: Timestamp
  reservedFrom: Timestamp
  reservedTo: Timestamp
  onSave: (from: Timestamp, to: Timestamp) => Promise<void>
}

/**
 * Shown under an item name in the reservation table. Reservations inherit the event's window by
 * default and show nothing here beyond a quiet way to opt in; a reservation whose stored dates
 * genuinely differ from the event's current window shows them plainly, with a one-click way back.
 */
export function ReservationDatesCell({ eventFrom, eventTo, reservedFrom, reservedTo, onSave }: ReservationDatesCellProps) {
  const isCustom = reservedFrom.toMillis() !== eventFrom.toMillis() || reservedTo.toMillis() !== eventTo.toMillis()
  const [editing, setEditing] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const openEditor = () => {
    setFrom(timestampToLocalInput(reservedFrom))
    setTo(timestampToLocalInput(reservedTo))
    setError('')
    setEditing(true)
  }

  const handleSave = async () => {
    const fromTs = localInputToTimestamp(from)
    const toTs = localInputToTimestamp(to)
    if (fromTs.toMillis() >= toTs.toMillis()) {
      setError('End must be after start.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(fromTs, toTs)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const handleUseEventDates = async () => {
    setSaving(true)
    setError('')
    try {
      await onSave(eventFrom, eventTo)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    if (isCustom) {
      return (
        <p className="mt-0.5 text-sm text-gray-500">
          Custom: {formatTimestamp(reservedFrom)} – {formatTimestamp(reservedTo)}{' '}
          <button type="button" onClick={openEditor} className="font-medium text-regal hover:underline">
            Edit
          </button>
        </p>
      )
    }
    return (
      <button type="button" onClick={openEditor} className="mt-0.5 text-sm text-gray-400 hover:text-regal hover:underline">
        + Custom dates
      </button>
    )
  }

  return (
    <div className="mt-1 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        <input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          disabled={saving}
          className="min-h-[36px] rounded-md border border-gray-300 bg-white px-1.5 text-sm text-gray-700 disabled:opacity-50"
        />
        <span className="text-sm text-gray-400">–</span>
        <input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          disabled={saving}
          className="min-h-[36px] rounded-md border border-gray-300 bg-white px-1.5 text-sm text-gray-700 disabled:opacity-50"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button type="button" onClick={handleSave} disabled={saving} className="font-medium text-regal hover:underline disabled:opacity-50">
          Save dates
        </button>
        {isCustom && (
          <button
            type="button"
            onClick={handleUseEventDates}
            disabled={saving}
            className="text-gray-500 hover:underline disabled:opacity-50"
          >
            Use event dates
          </button>
        )}
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="text-gray-500 hover:underline disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
