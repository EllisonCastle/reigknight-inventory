import { useState } from 'react'
import { useVenues } from '../hooks/useVenues'
import { VenueForm, type VenueFormValues } from '../components/venues/VenueForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import type { Venue } from '../types'

export function VenuesPage() {
  const { venues, loading, error, createVenue, updateVenue, deleteVenue } = useVenues()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Venue | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (venue: Venue) => {
    setEditing(venue)
    setModalOpen(true)
  }

  const handleSubmit = async (values: VenueFormValues) => {
    if (editing) {
      await updateVenue(editing.id, values)
    } else {
      await createVenue(values)
    }
    setModalOpen(false)
  }

  const handleDelete = async (venue: Venue) => {
    if (!confirm(`Delete venue "${venue.name}"? This cannot be undone.`)) return
    await deleteVenue(venue.id)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charcoal">Venues</h1>
        <Button onClick={openCreate} className="min-h-[44px]">
          + Add venue
        </Button>
      </div>

      <ErrorNotice message={error} />

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : venues.length === 0 ? (
        <p className="text-base text-gray-500">No venues yet. Add your first one.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-base">
            <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Description</th>
                <th className="px-4 py-2.5">Capacity</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {venues.map((venue) => (
                <tr key={venue.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">{venue.name}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-sm text-gray-600">{venue.description}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{venue.capacity ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(venue)}
                      className="mr-1 min-h-[44px] px-2 text-base font-medium text-regal hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(venue)}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit venue' : 'Add venue'}>
        <VenueForm initial={editing} onCancel={() => setModalOpen(false)} onSubmit={handleSubmit} />
      </Modal>
    </div>
  )
}
