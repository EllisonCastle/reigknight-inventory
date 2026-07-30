import { useMemo, useState } from 'react'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { usePermissions } from '../hooks/usePermissions'
import { InventoryForm, type InventoryFormFields } from '../components/inventory/InventoryForm'
import {
  InventoryFilters,
  applyInventoryFilters,
  applyInventorySort,
  emptyInventoryFilters,
  type InventoryFilterState,
  type InventorySortKey,
} from '../components/inventory/InventoryFilters'
import { CsvExportButton } from '../components/inventory/CsvExportButton'
import { CsvImportModal } from '../components/inventory/CsvImportModal'
import { QuickActionsMenu } from '../components/inventory/QuickActionsMenu'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { attentionInfo } from '../lib/inventoryStatus'
import type { InventoryItem, InventoryPhoto } from '../types'

function stripeClass(tone: 'amber' | 'red' | null): string {
  if (tone === 'red') return 'border-l-red-500'
  if (tone === 'amber') return 'border-l-amber-500'
  return 'border-l-transparent'
}

function AttentionBadge({ tone, label }: { tone: 'amber' | 'red' | null; label: string | null }) {
  if (!label) return null
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium ${
        tone === 'red' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
      }`}
    >
      {label}
    </span>
  )
}

export function InventoryPage() {
  const { items, loading, error, createItem, updateItem, deleteItem } = useInventoryItems()
  const { isAdminOrStaff } = usePermissions()
  const [filters, setFilters] = useState<InventoryFilterState>(emptyInventoryFilters)
  const [sort, setSort] = useState<InventorySortKey>('name')
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | undefined>(undefined)

  const filtered = useMemo(
    () => applyInventorySort(applyInventoryFilters(items, filters), sort),
    [items, filters, sort],
  )

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

  const handleDiscardDraft = (id: string) => {
    deleteItem(id).catch(() => {
      // best-effort cleanup of an abandoned draft item; nothing user-visible needed
    })
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold text-charcoal">Inventory</h1>
        <div className="flex flex-wrap gap-2">
          <CsvExportButton items={items} />
          <Button variant="secondary" onClick={() => setImportOpen(true)} className="min-h-[44px]">
            Import CSV
          </Button>
          <span title={isAdminOrStaff ? undefined : 'Admin or staff only'}>
            <Button onClick={openCreate} disabled={!isAdminOrStaff} className="min-h-[44px]">
              + Add item
            </Button>
          </span>
        </div>
      </div>

      <InventoryFilters items={items} value={filters} onChange={setFilters} sort={sort} onSortChange={setSort} />

      <ErrorNotice message={error} />

      {loading ? (
        <p className="text-base text-gray-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-base text-gray-500">No items match.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((item) => {
              const primary = item.photos?.find((p) => p.isPrimary) ?? item.photos?.[0]
              const attention = attentionInfo(item)
              return (
                <div
                  key={item.id}
                  className={`flex gap-3 rounded-lg border border-l-4 border-gray-200 bg-white p-3 ${stripeClass(attention.tone)}`}
                >
                  {isAdminOrStaff ? (
                    <>
                      <button type="button" onClick={() => openEdit(item)} className="shrink-0">
                        {primary ? (
                          <img src={primary.url} alt="" className="h-14 w-14 rounded object-cover" />
                        ) : (
                          <div className="h-14 w-14 rounded bg-surface" />
                        )}
                      </button>
                      <button type="button" onClick={() => openEdit(item)} className="min-w-0 flex-1 text-left">
                        <p className="truncate text-base font-medium text-charcoal">{item.name}</p>
                        <p className="truncate text-sm text-gray-500">
                          {item.category || '—'}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                        <div className="mt-1">
                          <AttentionBadge tone={attention.tone} label={attention.label} />
                        </div>
                      </button>
                      <QuickActionsMenu
                        item={item}
                        onUpdate={handleUpdate}
                        onPhotosChange={handlePhotosChange}
                        onDelete={handleDelete}
                      />
                    </>
                  ) : (
                    <>
                      <div className="shrink-0">
                        {primary ? (
                          <img src={primary.url} alt="" className="h-14 w-14 rounded object-cover" />
                        ) : (
                          <div className="h-14 w-14 rounded bg-surface" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-medium text-charcoal">{item.name}</p>
                        <p className="truncate text-sm text-gray-500">
                          {item.category || '—'}
                          {item.location ? ` · ${item.location}` : ''}
                        </p>
                        <div className="mt-1">
                          <AttentionBadge tone={attention.tone} label={attention.label} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white sm:block">
            <table className="w-full text-base">
              <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2.5" />
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Qty owned</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((item) => {
                  const primary = item.photos?.find((p) => p.isPrimary) ?? item.photos?.[0]
                  const attention = attentionInfo(item)
                  return (
                    <tr key={item.id} className={`border-l-4 ${stripeClass(attention.tone)}`}>
                      <td className="px-4 py-2.5">
                        {primary ? (
                          <img src={primary.url} alt="" className="h-10 w-10 rounded object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded bg-surface" />
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-charcoal">{item.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">{item.category || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {item.location || '—'}
                        {item.bin ? ` · ${item.bin}` : ''}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{item.totalQuantity}</td>
                      <td className="px-4 py-2.5">
                        {attention.label ? (
                          <AttentionBadge tone={attention.tone} label={attention.label} />
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isAdminOrStaff ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(item)}
                              className="min-h-[44px] px-2 text-base font-medium text-regal hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="min-h-[44px] px-2 text-base font-medium text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                            <QuickActionsMenu
                              item={item}
                              onUpdate={handleUpdate}
                              onPhotosChange={handlePhotosChange}
                              onDelete={handleDelete}
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400" title="Admin or staff only">
                            View only
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit item' : 'Add item'} wide>
        <InventoryForm
          initial={editing}
          onCancel={() => setModalOpen(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onPhotosChange={handlePhotosChange}
          onDiscardDraft={handleDiscardDraft}
        />
      </Modal>

      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} items={items} />
    </div>
  )
}
