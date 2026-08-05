import { useState } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { StatusPanel } from './StatusPanel'
import { PhotoUploader } from './PhotoUploader'
import { getItemTotalQuantity, rebalanceForNewTotal, reduceStorageEntriesBy, validateStatusCounts } from '../../lib/inventoryStatus'
import { useSaveFlash } from '../../hooks/useSaveFlash'
import type { InventoryFormFields } from './InventoryForm'
import type { InventoryItem, InventoryPhoto, StatusBreakdown, StorageEntry } from '../../types'

type Sheet = 'menu' | 'status' | 'photo' | 'quantity' | null

interface QuickActionsMenuProps {
  item: InventoryItem
  onUpdate: (id: string, data: Partial<InventoryFormFields>) => Promise<void>
  onPhotosChange: (id: string, photos: InventoryPhoto[]) => Promise<void>
  onDelete: (item: InventoryItem) => void | Promise<void>
}

export function QuickActionsMenu({ item, onUpdate, onPhotosChange, onDelete }: QuickActionsMenuProps) {
  const [sheet, setSheet] = useState<Sheet>(null)

  const handleDelete = () => {
    setSheet(null)
    onDelete(item)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet('menu')}
        aria-label="More actions"
        className="flex h-11 w-11 items-center justify-center rounded-md text-gray-500 hover:bg-surface hover:text-charcoal"
      >
        <span className="text-xl leading-none">⋯</span>
      </button>

      <BottomSheet open={sheet === 'menu'} onClose={() => setSheet(null)} title={item.name}>
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setSheet('status')}
            className="min-h-[44px] rounded-md px-2 text-left text-base font-medium text-charcoal hover:bg-surface"
          >
            Update status counts
          </button>
          <button
            type="button"
            onClick={() => setSheet('photo')}
            className="min-h-[44px] rounded-md px-2 text-left text-base font-medium text-charcoal hover:bg-surface"
          >
            Add photo
          </button>
          <button
            type="button"
            onClick={() => setSheet('quantity')}
            className="min-h-[44px] rounded-md px-2 text-left text-base font-medium text-charcoal hover:bg-surface"
          >
            Adjust quantity
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="min-h-[44px] rounded-md px-2 text-left text-base font-medium text-red-600 hover:bg-red-50"
          >
            Delete item
          </button>
        </div>
      </BottomSheet>

      {sheet === 'status' && (
        <StatusSheet item={item} onClose={() => setSheet(null)} onUpdate={onUpdate} />
      )}

      <BottomSheet open={sheet === 'photo'} onClose={() => setSheet(null)} title="Add photo">
        <PhotoUploader
          itemId={item.id}
          photos={item.photos}
          onChange={(photos) => onPhotosChange(item.id, photos)}
          autoOpenCamera
        />
      </BottomSheet>

      {sheet === 'quantity' && (
        <QuantitySheet item={item} onClose={() => setSheet(null)} onUpdate={onUpdate} />
      )}
    </>
  )
}

function StatusSheet({
  item,
  onClose,
  onUpdate,
}: {
  item: InventoryItem
  onClose: () => void
  onUpdate: (id: string, data: Partial<InventoryFormFields>) => Promise<void>
}) {
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>(item.statusBreakdown)
  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>(item.storageEntries ?? [])
  const totalQuantity = getItemTotalQuantity({ storageEntries, totalQuantity: item.totalQuantity })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { saved, flash } = useSaveFlash()

  const handleChange = (next: StatusBreakdown, totalQuantityDelta?: number) => {
    setStatusBreakdown(next)
    if (totalQuantityDelta && totalQuantityDelta < 0) {
      setStorageEntries((entries) => reduceStorageEntriesBy(entries, -totalQuantityDelta))
    }
  }

  const handleSave = async () => {
    const validation = validateStatusCounts(totalQuantity, statusBreakdown.needsRepair, statusBreakdown.needsReplacement)
    if (!validation.valid) {
      setError(validation.error ?? 'Counts must reconcile with total quantity.')
      return
    }
    setSaving(true)
    try {
      const data: Partial<InventoryFormFields> = { statusBreakdown }
      // Only write storageEntries once the item actually has real entries — writing an empty
      // array to a not-yet-migrated item would make the migration tool think it's done.
      if ((item.storageEntries?.length ?? 0) > 0 || storageEntries.length > 0) {
        data.storageEntries = storageEntries
      }
      await onUpdate(item.id, data)
      flash(onClose)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open onClose={onClose} title="Update status counts">
      <p className="mb-3 text-base text-gray-500">
        {item.name} · {totalQuantity} total owned
      </p>
      <StatusPanel totalQuantity={totalQuantity} statusBreakdown={statusBreakdown} onChange={handleChange} />
      {error && <p className="mt-2 text-base text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="min-h-[44px] flex-1">
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || saved} className="min-h-[44px] flex-1">
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </BottomSheet>
  )
}

function QuantitySheet({
  item,
  onClose,
  onUpdate,
}: {
  item: InventoryItem
  onClose: () => void
  onUpdate: (id: string, data: Partial<InventoryFormFields>) => Promise<void>
}) {
  const entries = item.storageEntries ?? []
  const singleEntry = entries.length === 1 ? entries[0] : null
  const [quantity, setQuantity] = useState(singleEntry?.quantity ?? 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { saved, flash } = useSaveFlash()

  const step = (delta: number) => {
    setQuantity((q) => Math.max(0, q + delta))
  }

  const handleSave = async () => {
    if (!singleEntry) return
    const prevTotal = getItemTotalQuantity(item)
    const nextTotal = prevTotal - singleEntry.quantity + quantity
    const statusBreakdown = rebalanceForNewTotal(item.statusBreakdown, prevTotal, nextTotal)
    const storageEntries = entries.map((e) => (e.id === singleEntry.id ? { ...e, quantity } : e))
    setSaving(true)
    setError('')
    try {
      await onUpdate(item.id, { storageEntries, statusBreakdown })
      flash(onClose)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (!singleEntry) {
    return (
      <BottomSheet open onClose={onClose} title="Adjust quantity">
        <p className="text-base text-gray-500">
          {entries.length === 0
            ? "This item hasn't been added to a storage location yet — use the full edit form, or run the migration tool from the Locations page."
            : 'This item is stored in multiple locations — adjust quantities from the full edit form.'}
        </p>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose} className="min-h-[44px]">
            Close
          </Button>
        </div>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet open onClose={onClose} title="Adjust quantity">
      <p className="mb-3 text-base text-gray-500">{item.name}</p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Decrease quantity"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 text-2xl text-charcoal hover:bg-surface"
        >
          −
        </button>
        <span className="min-w-[64px] text-center text-2xl font-semibold text-charcoal">{quantity}</span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Increase quantity"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 text-2xl text-charcoal hover:bg-surface"
        >
          +
        </button>
      </div>
      {error && <p className="mt-2 text-base text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="secondary" onClick={onClose} className="min-h-[44px] flex-1">
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving || saved} className="min-h-[44px] flex-1">
          {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </BottomSheet>
  )
}
