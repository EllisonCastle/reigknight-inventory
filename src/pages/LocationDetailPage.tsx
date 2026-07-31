import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLocations } from '../hooks/useLocations'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { usePermissions } from '../hooks/usePermissions'
import { InventoryForm, type InventoryFormFields } from '../components/inventory/InventoryForm'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Field'
import type { InventoryItem, InventoryPhoto, StorageEntry } from '../types'

interface BucketRow {
  item: InventoryItem
  entries: StorageEntry[]
}

export function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>()
  const { locations, loading: locationsLoading } = useLocations()
  const { items, loading: itemsLoading, createItem, updateItem } = useInventoryItems()
  const { isAdminOrStaff } = usePermissions()

  const [addOpen, setAddOpen] = useState(false)
  const [addSubLocationId, setAddSubLocationId] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [justAddedName, setJustAddedName] = useState<string | null>(null)

  const location = locations.find((l) => l.id === locationId)

  const buckets = useMemo(() => {
    if (!location || !locationId) return []
    const subLocs: { id: string | null; name: string }[] = [
      ...location.subLocations.map((s) => ({ id: s.id as string | null, name: s.name })),
      { id: null, name: 'No sub-location' },
    ]
    return subLocs
      .map((sub) => {
        const rows: BucketRow[] = items
          .map((item) => {
            const entries = (item.storageEntries ?? []).filter((e) => e.locationId === locationId && e.subLocationId === sub.id)
            return entries.length > 0 ? { item, entries } : null
          })
          .filter((r): r is BucketRow => r !== null)
        return { ...sub, rows }
      })
      .filter((bucket) => bucket.rows.length > 0)
  }, [items, location, locationId])

  const totalItemCount = buckets.reduce((sum, b) => sum + b.rows.length, 0)

  const handleCreate = async (data: InventoryFormFields) => {
    const ref = await createItem({ ...data, photos: [] })
    setJustAddedName(data.name)
    return ref.id
  }

  const handleUpdate = async (id: string, data: Partial<InventoryFormFields>) => {
    await updateItem(id, data)
    // InventoryForm creates a blank draft on mount (via handleCreate) so the photo uploader is
    // ready immediately, then the user's actual "Create item" click confirms it via onUpdate, not
    // a second onCreate call. This is the real confirm step — the one place on this page onUpdate
    // is ever called, since the form here is always in create mode, never editing an existing item.
    if (data.name) setJustAddedName(data.name)
  }

  const handlePhotosChange = async (id: string, photos: InventoryPhoto[]) => {
    await updateItem(id, { photos })
  }

  const handleAddAnother = () => {
    setJustAddedName(null)
    setFormKey((k) => k + 1)
  }

  const openAdd = () => {
    setJustAddedName(null)
    setFormKey((k) => k + 1)
    setAddOpen(true)
  }

  const closeAdd = () => {
    setAddOpen(false)
    setJustAddedName(null)
  }

  if (locationsLoading || itemsLoading) return <p className="text-base text-gray-500">Loading…</p>

  if (!location) {
    return (
      <div>
        <p className="text-base text-gray-500">Location not found.</p>
        <Link to="/locations" className="text-base font-medium text-regal hover:underline">
          Back to locations
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/locations" className="mb-4 inline-block text-base text-gray-500 hover:underline">
        ← Locations
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-charcoal">{location.name}</h1>
          <p className="text-sm text-gray-500">
            {totalItemCount} item{totalItemCount === 1 ? '' : 's'} stored here
          </p>
        </div>
        {isAdminOrStaff && (
          <div className="flex flex-wrap items-center gap-2">
            {location.subLocations.length > 0 && (
              <div className="w-48">
                <Select value={addSubLocationId ?? ''} onChange={(e) => setAddSubLocationId(e.target.value || null)}>
                  <option value="">No sub-location</option>
                  {location.subLocations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <Button onClick={openAdd}>+ Add item here</Button>
          </div>
        )}
      </div>

      {buckets.length === 0 ? (
        <p className="text-base text-gray-500">Nothing stored here yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {buckets.map((bucket) => (
            <div key={bucket.id ?? 'none'}>
              <p className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-gray-500">{bucket.name}</p>
              <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
                <table className="w-full text-base">
                  <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Bin(s)</th>
                      <th className="px-3 py-2">Qty here</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {bucket.rows.map(({ item, entries }) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-medium text-charcoal">
                          <Link to={`/inventory/${item.id}`} className="hover:underline">
                            {item.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{entries.map((e) => e.bin || '(no bin)').join(', ')}</td>
                        <td className="px-3 py-2 text-gray-600">{entries.reduce((sum, e) => sum + e.quantity, 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={closeAdd} title="Add item here" wide>
        {justAddedName && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-base text-green-800">
            <span>✓ Added &quot;{justAddedName}&quot;.</span>
            <button type="button" onClick={handleAddAnother} className="font-medium text-regal hover:underline">
              + Add another here
            </button>
          </div>
        )}
        <InventoryForm
          key={formKey}
          initialStorageEntry={{ locationId: location.id, subLocationId: addSubLocationId }}
          onCancel={closeAdd}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onPhotosChange={handlePhotosChange}
          onDiscardDraft={() => {}}
        />
      </Modal>
    </div>
  )
}
