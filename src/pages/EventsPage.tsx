import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents } from '../hooks/useEvents'
import { useVenues } from '../hooks/useVenues'
import { EventForm, type EventFormFields } from '../components/events/EventForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/Badge'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { formatTimestamp } from '../lib/datetime'
import type { EventDoc } from '../types'

export function EventsPage() {
  const { events, loading, error, createEvent, updateEvent, deleteEvent } = useEvents()
  const { venues } = useVenues()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EventDoc | undefined>(undefined)

  const venueName = useMemo(() => {
    const map = new Map(venues.map((v) => [v.id, v.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [venues])

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (event: EventDoc) => {
    setEditing(event)
    setModalOpen(true)
  }

  const handleSubmit = async (values: EventFormFields) => {
    if (editing) {
      await updateEvent(editing.id, values)
    } else {
      await createEvent(values)
    }
    setModalOpen(false)
  }

  const handleDelete = async (event: EventDoc) => {
    if (!confirm(`Delete event "${event.name}"? This cannot be undone.`)) return
    await deleteEvent(event.id)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charcoal">Events</h1>
        <Button onClick={openCreate} disabled={venues.length === 0} className="min-h-[44px]">
          + Add event
        </Button>
      </div>

      {venues.length === 0 && !loading && (
        <p className="mb-4 text-base text-amber-700">Add a venue first before creating an event.</p>
      )}

      <ErrorNotice message={error} />

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-base text-gray-500">No events yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-base">
            <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Venue</th>
                <th className="px-4 py-2.5">Start</th>
                <th className="px-4 py-2.5">End</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">
                    <Link to={`/events/${event.id}`} className="hover:underline">
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{venueName(event.venueId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatTimestamp(event.startAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatTimestamp(event.endAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(event)}
                      className="mr-1 min-h-[44px] px-2 text-base font-medium text-regal hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event)}
                      className="min-h-[44px] px-2 text-base font-medium text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit event' : 'Add event'} wide>
        <EventForm initial={editing} venues={venues} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
