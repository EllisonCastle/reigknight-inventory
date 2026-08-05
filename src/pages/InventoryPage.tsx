import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import { BatchMoveForm } from '../components/inventory/BatchMoveForm'
import { runBatchMove } from '../lib/batchMove'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { ErrorNotice } from '../components/ui/ErrorNotice'
import { attentionInfo, getItemTotalQuantity } from '../lib/inventoryStatus'
import { getEffectiveAvailability } from '../lib/kits'
import { useLocations } from '../hooks/useLocations'
import type { InventoryItem, InventoryPhoto, LocationDoc } from '../types'

/** Compact location summary for list rows: the single entry's resolved name, or a count when spread across several. */
function locationSummary(item: InventoryItem, locationsById: Map<string, LocationDoc>): string {
  if (item.storageEntries?.length) {
    if (item.storageEntries.length === 1) {
      const e = item.storageEntries[0]
      const loc = locationsById.get(e.locationId)
      return loc ? `${loc.name}${e.bin ? ` · ${e.bin}` : ''}` : 'Unknown location'
    }
    return `${item.storageEntries.length} locations`
  }
  return item.location || ''
}

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
  const { locations } = useLocations()
  const locationsById = useMemo(() => new Map(locations.map((l) => [l.id, l])), [locations])
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState<InventoryFilterState>(() => ({
    ...emptyInventoryFilters,
    attentionOnly: searchParams.get('attention') === '1',
  }))
  const [sort, setSort] = useState<InventorySortKey>('updatedAt')
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | undefined>(undefined)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [moveModalOpen, setMoveModalOpen] = useState(false)

  const filtered = useMemo(
    () => applyInventorySort(applyInventoryFilters(items, filters), sort, locationsById),
    [items, filters, sort, locationsById],
  )

  // Batch move's source is whatever specific location the list is currently filtered to — moving
  // only makes sense from one unambiguous starting point per the spec's "filter, then move" flow.
  const sourceLocationId = filters.locationId || null
  const sourceLocation = sourceLocationId ? locationsById.get(sourceLocationId) : undefined

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const handleBatchMove = async (targetLocationId: string, targetSubLocationId: string | null) => {
    if (!sourceLocationId) return
    await runBatchMove(items, [...selectedIds], sourceLocationId, targetLocationId, targetSubLocationId)
    setMoveModalOpen(false)
    exitSelectMode()
  }

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

      {sourceLocationId && isAdminOrStaff && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-surface p-3">
          <label className="flex min-h-[44px] items-center gap-2 text-base text-charcoal">
            <input
              type="checkbox"
              checked={selectMode}
              onChange={(e) => (e.target.checked ? setSelectMode(true) : exitSelectMode())}
              className="h-5 w-5"
            />
            Select items to move out of {sourceLocation?.name ?? 'this location'}
            {selectMode && selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ''}
          </label>
          {selectMode && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setSelectedIds(new Set(filtered.map((i) => i.id)))}
                className="min-h-[44px]"
              >
                Select all ({filtered.length})
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={selectedIds.size === 0}
                onClick={() => setSelectedIds(new Set())}
                className="min-h-[44px]"
              >
                Clear
              </Button>
              <Button type="button" disabled={selectedIds.size === 0} onClick={() => setMoveModalOpen(true)} className="min-h-[44px]">
                Move {selectedIds.size || ''} item{selectedIds.size === 1 ? '' : 's'}
              </Button>
            </div>
          )}
        </div>
      )}

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
                  {selectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelected(item.id)}
                      className="mt-1 h-5 w-5 shrink-0"
                      aria-label={`Select ${item.name}`}
                    />
                  )}
                  <Link to={`/inventory/${item.id}`} className="shrink-0">
                    {primary ? (
                      <img src={primary.url} alt="" className="h-14 w-14 rounded object-cover" />
                    ) : (
                      <div className="h-14 w-14 rounded bg-surface" />
                    )}
                  </Link>
                  <Link to={`/inventory/${item.id}`} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-base font-medium text-charcoal">{item.name}</p>
                    <p className="truncate text-sm text-gray-500">
                      {item.category || '—'}
                      {locationSummary(item, locationsById) ? ` · ${locationSummary(item, locationsById)}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getEffectiveAvailability(item, itemsById)} available
                      {getEffectiveAvailability(item, itemsById) !== getItemTotalQuantity(item) ? ` of ${getItemTotalQuantity(item)}` : ''}
                    </p>
                    <div className="mt-1">
                      <AttentionBadge tone={attention.tone} label={attention.label} />
                    </div>
                  </Link>
                  {isAdminOrStaff && (
                    <QuickActionsMenu
                      item={item}
                      onUpdate={handleUpdate}
                      onPhotosChange={handlePhotosChange}
                      onDelete={handleDelete}
                    />
                  )}
                </div>
              )
            })}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-gray-200 bg-white sm:block">
            <table className="w-full text-base">
              <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
                <tr>
                  {selectMode && <th className="px-4 py-2.5" />}
                  <th className="px-4 py-2.5" />
                  <th className="px-4 py-2.5">Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Qty owned</th>
                  <th className="px-4 py-2.5">Available</th>
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
                      {selectMode && (
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            className="h-5 w-5"
                            aria-label={`Select ${item.name}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <Link to={`/inventory/${item.id}`}>
                          {primary ? (
                            <img src={primary.url} alt="" className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-surface" />
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-charcoal">
                        <Link to={`/inventory/${item.id}`} className="hover:underline">
                          {item.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{item.category || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{locationSummary(item, locationsById) || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{getItemTotalQuantity(item)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{getEffectiveAvailability(item, itemsById)}</td>
                      <td className="px-4 py-2.5">
                        {attention.label ? (
                          <AttentionBadge tone={attention.tone} label={attention.label} />
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {isAdminOrStaff && (
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
          items={items}
          onCancel={() => setModalOpen(false)}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onPhotosChange={handlePhotosChange}
          onDiscardDraft={handleDiscardDraft}
        />
      </Modal>

      <CsvImportModal open={importOpen} onClose={() => setImportOpen(false)} items={items} />

      <Modal open={moveModalOpen} onClose={() => setMoveModalOpen(false)} title="Move items">
        <BatchMoveForm
          sourceLocationName={sourceLocation?.name ?? ''}
          itemCount={selectedIds.size}
          onCancel={() => setMoveModalOpen(false)}
          onConfirm={handleBatchMove}
        />
      </Modal>
    </div>
  )
}
