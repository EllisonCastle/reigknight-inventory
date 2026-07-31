import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { usePermissions } from '../hooks/usePermissions'
import { InventoryForm, type InventoryFormFields } from '../components/inventory/InventoryForm'
import { Lightbox } from '../components/inventory/Lightbox'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { attentionInfo, availableForRental } from '../lib/inventoryStatus'
import { formatDate, formatRelativeTime } from '../lib/datetime'
import { formatCurrency, grossProfit } from '../lib/currency'
import { useVendors } from '../hooks/useVendors'
import type { InventoryPhoto } from '../types'

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-base text-charcoal">{value}</p>
    </div>
  )
}

function StatusTile({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'amber' | 'red' }) {
  const bg = tone === 'amber' ? 'bg-amber-50' : tone === 'red' ? 'bg-red-50' : 'bg-surface'
  const text = tone === 'amber' ? 'text-amber-800' : tone === 'red' ? 'text-red-800' : 'text-charcoal'
  return (
    <div className={`rounded-lg p-3 text-center ${bg}`}>
      <p className={`text-xl font-semibold ${text}`}>{value}</p>
      <p className={`text-sm ${text}`}>{label}</p>
    </div>
  )
}

export function InventoryDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const { items, loading, updateItem } = useInventoryItems()
  const { isAdminOrStaff } = usePermissions()
  const { vendors } = useVendors()
  const [editOpen, setEditOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const item = items.find((i) => i.id === itemId)
  const vendor = item?.vendorId ? vendors.find((v) => v.id === item.vendorId) : undefined

  const sortedPhotos = useMemo(() => {
    if (!item) return []
    return [...item.photos].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [item])
  const primary = sortedPhotos.find((p) => p.isPrimary) ?? sortedPhotos[0]

  const handleUpdate = async (id: string, data: Partial<InventoryFormFields>) => {
    await updateItem(id, data)
  }
  const handlePhotosChange = async (id: string, photos: InventoryPhoto[]) => {
    await updateItem(id, { photos })
  }

  if (loading) return <p className="text-base text-gray-500">Loading…</p>
  if (!item) {
    return (
      <div>
        <p className="text-base text-gray-500">Item not found.</p>
        <Link to="/inventory" className="text-base font-medium text-regal hover:underline">
          Back to inventory
        </Link>
      </div>
    )
  }

  const attention = attentionInfo(item)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/inventory" className="text-base text-gray-500 hover:underline">
          ← Inventory
        </Link>
        {isAdminOrStaff && (
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            Edit item
          </Button>
        )}
      </div>

      <div className="mb-6 flex flex-col items-center">
        {primary ? (
          <button
            type="button"
            onClick={() => setLightboxIndex(sortedPhotos.indexOf(primary))}
            className="aspect-square w-[65%] overflow-hidden rounded-xl border border-gray-200 sm:w-[45%]"
          >
            <img src={primary.url} alt="" className="h-full w-full object-cover" />
          </button>
        ) : (
          <div className="flex aspect-square w-[65%] items-center justify-center rounded-xl bg-surface text-base text-gray-400 sm:w-[45%]">
            No photo
          </div>
        )}
        {sortedPhotos.length > 1 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {sortedPhotos.map((photo, i) => (
              <button
                key={photo.path}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className={`h-14 w-14 overflow-hidden rounded-md border-2 ${photo.isPrimary ? 'border-regal' : 'border-transparent'}`}
              >
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <h1 className="text-xl font-semibold text-charcoal">{item.name}</h1>
      <div className="mb-3 mt-2 flex flex-wrap items-center gap-2">
        {attention.tone && attention.label && <Badge tone={attention.tone}>{attention.label}</Badge>}
        {item.category && <Badge>{item.category}</Badge>}
      </div>
      {item.description && <p className="mb-4 whitespace-pre-wrap text-base text-gray-600">{item.description}</p>}

      <div className="mb-4 grid grid-cols-2 gap-4">
        <Field label="Material" value={item.material || '—'} />
        <Field label="Color" value={item.color === 'Custom' ? item.colorCustom || 'Custom' : item.color || '—'} />
        <Field label="Condition" value={item.condition || '—'} />
        <Field label="Model" value={item.model || '—'} />
        <Field label="Dimensions" value={item.dimensions || '—'} />
      </div>

      {item.tags.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-sm text-gray-500">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-regal/20 bg-regal-light px-3 py-1 text-sm font-medium text-regal"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4">
        <Field label="Location" value={item.location || (vendor ? 'Through Vendor' : '—')} />
        <Field label="Bin" value={item.bin || '—'} />
      </div>

      {vendor && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-1 text-sm text-gray-500">Sourced through vendor</p>
          <p className="text-base font-medium text-charcoal">{vendor.name}</p>
          {(vendor.contact || vendor.phone || vendor.email) && (
            <p className="text-sm text-gray-600">
              {[vendor.contact, vendor.phone, vendor.email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      {(item.costPrice != null || item.rentalPrice != null) && (
        <div className="mb-4 grid grid-cols-2 gap-4">
          <Field label="Cost price / unit" value={item.costPrice != null ? formatCurrency(item.costPrice) : '—'} />
          <Field label="Rental price / unit" value={item.rentalPrice != null ? formatCurrency(item.rentalPrice) : '—'} />
          {grossProfit(item.costPrice, item.rentalPrice) != null && (
            <Field label="Gross profit / unit" value={formatCurrency(grossProfit(item.costPrice, item.rentalPrice)!)} />
          )}
        </div>
      )}

      {item.notes && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-surface p-4">
          <p className="mb-1 text-sm text-gray-500">Internal notes</p>
          <p className="whitespace-pre-wrap text-base text-charcoal">{item.notes}</p>
        </div>
      )}

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-3 text-base font-semibold text-charcoal">
          Status · {availableForRental(item)} available for rental of {item.totalQuantity} total owned
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatusTile label="Good" value={availableForRental(item)} tone="neutral" />
          <StatusTile label="Needs Repair" value={item.statusBreakdown.needsRepair} tone="amber" />
          <StatusTile label="Needs Replacement" value={item.statusBreakdown.needsReplacement} tone="red" />
        </div>
      </div>

      <p className="mb-6 text-sm text-gray-500">
        Created {formatDate(item.createdAt)} · Last updated {formatRelativeTime(item.updatedAt)}
      </p>

      {lightboxIndex !== null && (
        <Lightbox
          photos={sortedPhotos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit item" wide>
        <InventoryForm
          initial={item}
          onCancel={() => setEditOpen(false)}
          onCreate={async () => item.id}
          onUpdate={handleUpdate}
          onPhotosChange={handlePhotosChange}
          onDiscardDraft={() => {}}
        />
      </Modal>
    </div>
  )
}
