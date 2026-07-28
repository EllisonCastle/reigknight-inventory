import { useMemo, useState } from 'react'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { InventoryForm, type InventoryFormFields } from '../components/inventory/InventoryForm'
import { InventoryFilters, applyInventoryFilters, type InventoryFilterState } from '../components/inventory/InventoryFilters'
import { CsvExportButton } from '../components/inventory/CsvExportButton'
import { CsvImportModal } from '../components/inventory/CsvImportModal'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import type { InventoryItem, InventoryPhoto } from '../types'

const emptyFilters: InventoryFilterState = { search: '', tags: [], color: '', location: '' }

export function InventoryPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } = useInventoryItems()
  const [filters, setFilters] = useState<InventoryFilterState>(emptyFilters)
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | undefined>(undefined)

  const filtered = useMemo(() => applyInventoryFilters(items, filters), [items, filters])

  const openCreate = () => {
    setEditing(undefined)
    setModalOpen(true)
  }

  const openEdit = (item: InventoryItem) => {
    setEditing(item)
    setModalOpen(true)
  }

  const handleCreate = async (data: InventoryFormFields) => {
    const ref = await createItem({ ...data, photos: [] })
    return ref.id
  }

  const handleUpdate = async (id: string, data: Partial<InventoryFormFields>) => {
    await updateItem(id, data)
  }

  const handlePhotosChange = async (id: string, photos: InventoryPhoto[]) => {
    await updateItem(id, { photos })
  }

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return
    await deleteItem(item.id)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-charcoal">Inventory</h1>
        <div className="flex gap-2">
          <CsvExportButton items={items} />
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
          <Button onClick={openCreate}>+ Add item</Button>
        </div>
      </div>

      <InventoryFilters items={items} value={filters} onChange={setFilters} />

      <ErrorNotice message={error} />

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">No items match.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5" />
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Tags</th>
                <th className="px-4 py-2.5">Color</th>
                <th className="px-4 py-2.5">Location</th>
                <th className="px-4 py-2.5">Qty owned</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((item) => {
                const primary = item.photos?.find((p) => p.isPrimary) ?? item.photos?.[0]
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-2.5">
                      {primary ? (
                        <img src={primary.url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-surface" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-charcoal">{item.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {(item.tags ?? []).map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{item.color || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.location || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.totalQuantity}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => openEdit(item)}
                        className="mr-3 text-sm font-medium text-regal hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="text-sm font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit item' : 'Add item'} wide>
        <InventoryForm
          initial={editing}
          onCancel={() => setModalOpen(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onPhotosChange={handlePhotosChange}
        />
      </Modal>

      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} items={items} />
    </div>
  )
}
