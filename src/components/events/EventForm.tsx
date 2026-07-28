import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Select, TextArea } from '../ui/Field'
import { VenueConflictWarning } from './ConflictWarning'
import { checkVenueConflict, type VenueConflict } from '../../lib/availability'
import { localInputToTimestamp, timestampToLocalInput } from '../../lib/datetime'
import { EVENT_STATUSES, type EventDoc, type EventStatus, type Venue } from '../../types'

export interface EventFormFields {
  name: string
  venueId: string
  startAt: ReturnType<typeof localInputToTimestamp>
  endAt: ReturnType<typeof localInputToTimestamp>
  status: EventStatus
  clientName: string
  clientContact: string
  notes: string
  checkinEventId: string
}

interface EventFormProps {
  initial?: EventDoc
  venues: Venue[]
  onCancel: () => void
  onSubmit: (values: EventFormFields) => Promise<void>
}

export function EventForm({ initial, venues, onCancel, onSubmit }: EventFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [venueId, setVenueId] = useState(initial?.venueId ?? venues[0]?.id ?? '')
  const [startAt, setStartAt] = useState(timestampToLocalInput(initial?.startAt))
  const [endAt, setEndAt] = useState(timestampToLocalInput(initial?.endAt))
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? 'draft')
  const [clientName, setClientName] = useState(initial?.clientName ?? '')
  const [clientContact, setClientContact] = useState(initial?.clientContact ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [checkinEventId, setCheckinEventId] = useState(initial?.checkinEventId ?? '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<VenueConflict[]>([])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setConflicts([])

    if (!name.trim() || !venueId || !startAt || !endAt) {
      setError('Name, venue, start, and end are required.')
      return
    }

    const startTs = localInputToTimestamp(startAt)
    const endTs = localInputToTimestamp(endAt)
    if (startTs.toMillis() >= endTs.toMillis()) {
      setError('End must be after start.')
      return
    }

    setSaving(true)
    try {
      const { hasConflict, conflicts: found } = await checkVenueConflict(venueId, startTs, endTs, initial?.id)
      if (hasConflict) {
        setConflicts(found)
        return
      }

      await onSubmit({
        name: name.trim(),
        venueId,
        startAt: startTs,
        endAt: endTs,
        status,
        clientName: clientName.trim(),
        clientContact: clientContact.trim(),
        notes: notes.trim(),
        checkinEventId: checkinEventId.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormRow label="Event name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </FormRow>

      <FormRow label="Venue">
        <Select value={venueId} onChange={(e) => setVenueId(e.target.value)} required>
          <option value="" disabled>
            Select a venue…
          </option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </FormRow>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Start (setup)">
          <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required />
        </FormRow>
        <FormRow label="End (teardown)">
          <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
        </FormRow>
      </div>

      <FormRow label="Status">
        <Select value={status} onChange={(e) => setStatus(e.target.value as EventStatus)}>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
      </FormRow>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Client name">
          <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </FormRow>
        <FormRow label="Client contact">
          <Input value={clientContact} onChange={(e) => setClientContact(e.target.value)} />
        </FormRow>
      </div>

      <FormRow label="Notes">
        <TextArea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormRow>

      <FormRow label="Check-in app event ID (optional, wired up in a later phase)">
        <Input value={checkinEventId} onChange={(e) => setCheckinEventId(e.target.value)} />
      </FormRow>

      <VenueConflictWarning conflicts={conflicts} />
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save event'}
        </Button>
      </div>
    </form>
  )
}
