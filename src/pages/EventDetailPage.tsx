import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useVenues } from '../hooks/useVenues'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { usePeople } from '../hooks/usePeople'
import { EventForm, type EventFormFields } from '../components/events/EventForm'
import { ReservationManager } from '../components/events/ReservationManager'
import { TaskManager } from '../components/tasks/TaskManager'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { formatTimestamp } from '../lib/datetime'

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const { events, loading, updateEvent } = useEvents()
  const { venues } = useVenues()
  const { items } = useInventoryItems()
  const { people } = usePeople()
  const [editOpen, setEditOpen] = useState(false)

  const event = events.find((e) => e.id === eventId)
  const venue = venues.find((v) => v.id === event?.venueId)

  const handleSubmit = async (values: EventFormFields) => {
    if (!event) return
    await updateEvent(event.id, values)
    setEditOpen(false)
  }

  if (loading) return <p className="text-base text-gray-500">Loading…</p>
  if (!event) {
    return (
      <div>
        <p className="text-base text-gray-500">Event not found.</p>
        <Link to="/events" className="text-base font-medium text-regal hover:underline">
          Back to events
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/events" className="text-base text-gray-500 hover:underline">
        ← Events
      </Link>

      <div className="mt-2 mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">{event.name}</h1>
          <p className="mt-1 text-base text-gray-600">
            {venue?.name ?? 'Unknown venue'} · {formatTimestamp(event.startAt)} – {formatTimestamp(event.endAt)}
          </p>
          <div className="mt-2">
            <StatusBadge status={event.status} />
          </div>
        </div>
        <Button variant="secondary" onClick={() => setEditOpen(true)}>
          Edit event
        </Button>
      </div>

      {(event.clientName || event.clientContact || event.notes) && (
        <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-base">
          {event.clientName && (
            <p>
              <span className="font-medium text-charcoal">Client:</span> {event.clientName}
            </p>
          )}
          {event.clientContact && (
            <p>
              <span className="font-medium text-charcoal">Contact:</span> {event.clientContact}
            </p>
          )}
          {event.notes && <p className="mt-2 whitespace-pre-wrap text-gray-600">{event.notes}</p>}
        </div>
      )}

      <ReservationManager event={event} items={items} />

      <TaskManager eventId={event.id} people={people} />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit event" wide>
        <EventForm initial={event} venues={venues} onCancel={() => setEditOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
