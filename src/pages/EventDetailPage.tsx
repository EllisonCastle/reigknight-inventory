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
  const [copied, setCopied] = useState(false)

  const event = events.find((e) => e.id === eventId)
  const venue = venues.find((v) => v.id === event?.venueId)

  const handleSubmit = async (values: EventFormFields) => {
    if (!event) return
    await updateEvent(event.id, values)
    setEditOpen(false)
  }

  const shareUrl = event ? `${window.location.origin}/share/${event.shareToken}` : ''

  const handleCopyShareLink = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-lg font-semibold text-charcoal">Share link</h2>
        <p className="mb-3 text-sm text-gray-500">
          Read-only progress view — no login required, no edit controls.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            readOnly
            value={shareUrl}
            onFocus={(e) => e.target.select()}
            className="min-h-[44px] flex-1 rounded-md border border-gray-300 bg-surface px-3 text-base text-gray-700"
          />
          <Button type="button" variant="secondary" onClick={handleCopyShareLink}>
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      </div>

      <ReservationManager event={event} items={items} />

      <TaskManager eventId={event.id} people={people} />

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit event" wide>
        <EventForm initial={event} venues={venues} onCancel={() => setEditOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
