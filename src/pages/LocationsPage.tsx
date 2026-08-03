import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocations } from '../hooks/useLocations'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { LocationForm, type LocationFormValues } from '../components/locations/LocationForm'
import { MigrationTool } from '../components/locations/MigrationTool'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { THROUGH_VENDOR_LOCATION_ID } from '../types'
import type { LocationDoc } from '../types'

type Tab = 'locations' | 'migration'

export function LocationsPage() {
  const {
    locations,
    loading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
    addSubLocation,
    renameSubLocation,
    removeSubLocation,
    countItemsAtLocation,
  } = useLocations()
  const { items } = useInventoryItems()

  const [tab, setTab] = useState<Tab>('locations')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LocationDoc | undefined>(undefined)

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (location: LocationDoc) => {
    setEditing(location)
    setModalOpen(true)
  }

  const handleSubmit = async (values: LocationFormValues) => {
    if (editing) {
      await updateLocation(editing.id, values)
      setEditing(locations.find((l) => l.id === editing.id) ?? editing)
    } else {
      await createLocation(values)
      setModalOpen(false)
    }
  }

  const handleDeleteClick = async (location: LocationDoc) => {
    if (location.id === THROUGH_VENDOR_LOCATION_ID) {
      alert('The "Through Vendor" location is managed automatically and can\'t be deleted.')
      return
    }
    const count = countItemsAtLocation(items, location.id)
    if (count > 0) {
      alert(`${count} item${count === 1 ? ' is' : 's are'} still here (including any sub-locations) — move them first.`)
      return
    }
    if (!confirm(`Remove "${location.name}"? This cannot be undone.`)) return
    await deleteLocation(location.id)
  }

  // Keep the modal's `editing` location in sync with live data as sub-locations change underneath it.
  const editingLive = editing ? locations.find((l) => l.id === editing.id) ?? editing : undefined

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-charcoal">Locations</h1>
        {tab === 'locations' && <Button onClick={openCreate}>+ Add location</Button>}
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab('locations')}
          className={`min-h-[44px] border-b-2 px-3 text-base font-medium ${
            tab === 'locations' ? 'border-regal text-regal' : 'border-transparent text-gray-500 hover:text-charcoal'
          }`}
        >
          Locations
        </button>
        <button
          type="button"
          onClick={() => setTab('migration')}
          className={`min-h-[44px] border-b-2 px-3 text-base font-medium ${
            tab === 'migration' ? 'border-regal text-regal' : 'border-transparent text-gray-500 hover:text-charcoal'
          }`}
        >
          Migration
        </button>
      </div>

      {tab === 'migration' ? (
        <MigrationTool items={items} locations={locations} createLocation={createLocation} />
      ) : (
        <>
          <ErrorNotice message={error} />

          {loading ? (
            <p className="text-base text-gray-500">Loading…</p>
          ) : locations.length === 0 ? (
            <p className="text-base text-gray-500">No locations yet. Add one, or map your existing free-text locations from the Migration tab.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-base">
                <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Sub-locations</th>
                    <th className="px-4 py-2.5">Items</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <td className="px-4 py-3 font-medium text-charcoal">
                        <Link to={`/locations/${location.id}`} className="hover:underline">
                          {location.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={location.type === 'vendor' ? 'regal' : 'neutral'}>
                          {location.type === 'vendor' ? 'Vendor' : 'Standard'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{location.subLocations.length || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{countItemsAtLocation(items, location.id)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(location)}
                          className="mr-1 min-h-[44px] px-2 text-base font-medium text-regal hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteClick(location)}
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
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit location' : 'Add location'}>
        <LocationForm
          initial={editingLive}
          itemCountForSubLocation={(subLocationId) =>
            editingLive ? countItemsAtLocation(items, editingLive.id, subLocationId) : 0
          }
          onCancel={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          onAddSubLocation={editingLive ? (name) => addSubLocation(editingLive, name) : undefined}
          onRenameSubLocation={editingLive ? (subId, name) => renameSubLocation(editingLive, subId, name) : undefined}
          onRemoveSubLocation={editingLive ? (subId) => removeSubLocation(editingLive, subId) : undefined}
        />
      </Modal>
    </div>
  )
}
