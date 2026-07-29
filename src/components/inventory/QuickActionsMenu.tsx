import { useState } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { StatusPanel } from './StatusPanel'
import { PhotoUploader } from './PhotoUploader'
import { rebalanceForNewTotal, validateStatusCounts } from '../../lib/inventoryStatus'
import type { InventoryFormFields } from './InventoryForm'
import type { InventoryItem, InventoryPhoto, StatusBreakdown } from '../../types'

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
  const [totalQuantity, setTotalQuantity] = useState(item.totalQuantity)
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>(item.statusBreakdown)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (next: StatusBreakdown, totalQuantityDelta?: number) => {
    setStatusBreakdown(next)
    if (totalQuantityDelta) setTotalQuantity((t) => t + totalQuantityDelta)
  }

  const handleSave = async () => {
    const validation = validateStatusCounts(totalQuantity, statusBreakdown.needsRepair, statusBreakdown.needsReplacement)
    if (!validation.valid) {
      setError(validation.error ?? 'Counts must reconcile with total quantity.')
      return
    }
    setSaving(true)
    try {
      await onUpdate(item.id, { totalQuantity, statusBreakdown })
      onClose()
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
        <Button type="button" onClick={handleSave} disabled={saving} className="min-h-[44px] flex-1">
          {saving ? 'Saving…' : 'Save'}
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
  const [totalQuantity, setTotalQuantity] = useState(item.totalQuantity)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const step = (delta: number) => {
    setTotalQuantity((t) => Math.max(0, t + delta))
  }

  const handleSave = async () => {
    const statusBreakdown = rebalanceForNewTotal(item.statusBreakdown, item.totalQuantity, totalQuantity)
    setSaving(true)
    setError('')
    try {
      await onUpdate(item.id, { totalQuantity, statusBreakdown })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
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
        <span className="min-w-[64px] text-center text-2xl font-semibold text-charcoal">{totalQuantity}</span>
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
        <Button type="button" onClick={handleSave} disabled={saving} className="min-h-[44px] flex-1">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </BottomSheet>
  )
}
