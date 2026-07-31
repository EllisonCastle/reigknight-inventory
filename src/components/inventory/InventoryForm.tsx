import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Label, Select, TextArea } from '../ui/Field'
import { PhotoUploader } from './PhotoUploader'
import { TagInput } from './TagInput'
import { ItemPresetPicker } from './ItemPresetPicker'
import { StatusPanel } from './StatusPanel'
import { StorageEntriesEditor } from './StorageEntriesEditor'
import { CATEGORIES, COLORS, CONDITIONS, MATERIALS } from '../../constants/inventory'
import { getItemTotalQuantity, rebalanceForNewTotal, reduceStorageEntriesBy, validateStatusCounts } from '../../lib/inventoryStatus'
import { useVendors } from '../../hooks/useVendors'
import { getOrCreateVendorLocation } from '../../lib/vendorLocation'
import { formatCurrency } from '../../lib/currency'
import { THROUGH_VENDOR_LOCATION_ID } from '../../types'
import type { InventoryItem, InventoryPhoto, StatusBreakdown, StorageEntry } from '../../types'
import type { ItemPreset } from '../../constants/itemPresets'

export interface InventoryFormFields {
  name: string
  description: string
  category: string
  material: string
  color: string
  colorCustom: string
  tags: string[]
  storageEntries: StorageEntry[]
  condition: string
  statusBreakdown: StatusBreakdown
  model: string
  notes: string
  dimensions: string
  costPrice: number | null
  rentalPrice: number | null
  vendorId: string
}

interface InventoryFormProps {
  initial?: InventoryItem
  /** Pre-fills one storage entry when opening the form from a location's "Add item here" — create mode only. */
  initialStorageEntry?: { locationId: string; subLocationId?: string | null }
  onCancel: () => void
  onCreate: (data: InventoryFormFields) => Promise<string>
  onUpdate: (id: string, data: Partial<InventoryFormFields>) => Promise<void>
  onPhotosChange: (id: string, photos: InventoryPhoto[]) => Promise<void>
  onDiscardDraft: (id: string) => void
}

const emptyStatus: StatusBreakdown = { good: 0, needsRepair: 0, needsReplacement: 0 }

const blankDraftFields: InventoryFormFields = {
  name: '',
  description: '',
  category: '',
  material: '',
  color: '',
  colorCustom: '',
  tags: [],
  storageEntries: [],
  condition: 'Good',
  statusBreakdown: emptyStatus,
  model: '',
  notes: '',
  dimensions: '',
  costPrice: null,
  rentalPrice: null,
  vendorId: '',
}

export function InventoryForm({
  initial,
  initialStorageEntry,
  onCancel,
  onCreate,
  onUpdate,
  onPhotosChange,
  onDiscardDraft,
}: InventoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [material, setMaterial] = useState(initial?.material ?? '')
  const [color, setColor] = useState(initial?.color ?? '')
  const [colorCustom, setColorCustom] = useState(initial?.colorCustom ?? '')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [vendorId, setVendorId] = useState(initial?.vendorId ?? '')
  const { vendors } = useVendors()

  const initialNonVendorEntries = (initial?.storageEntries ?? []).filter((e) => e.locationId !== THROUGH_VENDOR_LOCATION_ID)
  const initialVendorQty = (initial?.storageEntries ?? [])
    .filter((e) => e.locationId === THROUGH_VENDOR_LOCATION_ID)
    .reduce((sum, e) => sum + e.quantity, 0)

  const [storageEntries, setStorageEntries] = useState<StorageEntry[]>(() => {
    if (initial) return initialNonVendorEntries
    if (initialStorageEntry) {
      return [
        {
          id: crypto.randomUUID(),
          locationId: initialStorageEntry.locationId,
          subLocationId: initialStorageEntry.subLocationId ?? null,
          bin: '',
          quantity: 0,
          packSize: null,
        },
      ]
    }
    return []
  })
  const [vendorQuantity, setVendorQuantity] = useState<string>(initial ? String(initialVendorQty) : '')

  const totalQuantity = vendorId ? Number(vendorQuantity) || 0 : getItemTotalQuantity({ storageEntries })
  const prevTotalRef = useRef(totalQuantity)

  const [condition, setCondition] = useState(initial?.condition ?? 'Good')
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>(
    initial?.statusBreakdown ?? { ...emptyStatus, good: totalQuantity },
  )
  const [model, setModel] = useState(initial?.model ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [dimensions, setDimensions] = useState(initial?.dimensions ?? '')
  const [costPrice, setCostPrice] = useState<string>(initial?.costPrice != null ? String(initial.costPrice) : '')
  const [rentalPrice, setRentalPrice] = useState<string>(initial?.rentalPrice != null ? String(initial.rentalPrice) : '')

  const [savedId, setSavedId] = useState<string | undefined>(initial?.id)
  const [photos, setPhotos] = useState<InventoryPhoto[]>(initial?.photos ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Total quantity is now derived from storageEntries (or the vendor quantity), never typed
  // directly — this keeps the good/needsRepair/needsReplacement auto-balance invariant firing
  // no matter which input actually changed the total.
  useEffect(() => {
    const prev = prevTotalRef.current
    if (prev !== totalQuantity) {
      setStatusBreakdown((s) => rebalanceForNewTotal(s, prev, totalQuantity))
      prevTotalRef.current = totalQuantity
    }
  }, [totalQuantity])

  useEffect(() => {
    if (vendorId) {
      getOrCreateVendorLocation().catch(() => {
        // non-fatal — the vendor location gets created on the next successful attempt
      })
    }
  }, [vendorId])

  // For a brand-new item, a blank draft doc is created immediately on mount so the
  // photo uploader (which needs a real item id) is available right away instead of
  // forcing a save-then-reopen round trip. If the user closes without confirming,
  // the draft is discarded so it never shows up as a real inventory item.
  const [preparingDraft, setPreparingDraft] = useState(!initial)
  const [draftError, setDraftError] = useState('')
  const [confirmed, setConfirmed] = useState(Boolean(initial))
  const confirmedRef = useRef(confirmed)
  const savedIdRef = useRef(savedId)

  useEffect(() => {
    confirmedRef.current = confirmed
  }, [confirmed])

  const updateSavedId = (id: string | undefined) => {
    savedIdRef.current = id
    setSavedId(id)
  }

  useEffect(() => {
    if (initial) return
    let cancelled = false

    onCreate(blankDraftFields)
      .then((id) => {
        if (cancelled) {
          onDiscardDraft(id)
        } else {
          updateSavedId(id)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDraftError('Photo upload will be ready right after you save.')
        }
      })
      .finally(() => {
        if (!cancelled) setPreparingDraft(false)
      })

    return () => {
      cancelled = true
      if (!confirmedRef.current && savedIdRef.current) {
        onDiscardDraft(savedIdRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePresetSelect = (preset: ItemPreset) => {
    setName(preset.name)
    setCategory(preset.category)
    setMaterial(preset.material)
    setDescription(preset.description)
  }

  const handleStatusChange = (next: StatusBreakdown, totalQuantityDelta?: number) => {
    setStatusBreakdown(next)
    if (totalQuantityDelta && totalQuantityDelta < 0) {
      const amount = -totalQuantityDelta
      if (vendorId) {
        setVendorQuantity((q) => String(Math.max(0, (Number(q) || 0) - amount)))
      } else {
        setStorageEntries((entries) => reduceStorageEntriesBy(entries, amount))
      }
    }
  }

  const buildFields = (): InventoryFormFields => ({
    name: name.trim(),
    description: description.trim(),
    category,
    material,
    color,
    colorCustom: color === 'Custom' ? colorCustom.trim() : '',
    tags,
    storageEntries: vendorId
      ? Number(vendorQuantity) > 0
        ? [
            {
              id: crypto.randomUUID(),
              locationId: THROUGH_VENDOR_LOCATION_ID,
              subLocationId: null,
              bin: '',
              quantity: Number(vendorQuantity),
              packSize: null,
            },
          ]
        : []
      : storageEntries.filter((e) => e.locationId),
    condition,
    statusBreakdown,
    model: model.trim(),
    notes: notes.trim(),
    dimensions: dimensions.trim(),
    costPrice: costPrice.trim() === '' ? null : Number(costPrice),
    rentalPrice: rentalPrice.trim() === '' ? null : Number(rentalPrice),
    vendorId,
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required.')
    if (!category) return setError('Category is required.')
    if (!vendorId && !storageEntries.some((entry) => entry.locationId)) {
      return setError('Add at least one storage location (or select a vendor for a vendor-sourced item).')
    }

    const validation = validateStatusCounts(totalQuantity, statusBreakdown.needsRepair, statusBreakdown.needsReplacement)
    if (!validation.valid) return setError(validation.error ?? 'Status counts must reconcile with total quantity.')

    setError('')
    setSaving(true)
    try {
      const fields = buildFields()
      if (savedId) {
        await onUpdate(savedId, fields)
      } else {
        const id = await onCreate(fields)
        updateSavedId(id)
      }
      setConfirmed(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotosChange = async (next: InventoryPhoto[]) => {
    if (!savedId) return
    setPhotos(next)
    await onPhotosChange(savedId, next)
  }

  const hasLegacyLocation = Boolean(initial && !initial.storageEntries?.length && (initial.location || initial.totalQuantity))

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!initial && <ItemPresetPicker onSelect={handlePresetSelect} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </FormRow>
        <FormRow label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="" disabled>
              Select a category…
            </option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormRow>
      </div>

      <FormRow label="Description">
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormRow>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Material (optional)">
          <Select value={material} onChange={(e) => setMaterial(e.target.value)}>
            <option value="">None</option>
            {MATERIALS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
        </FormRow>
        <div>
          <FormRow label="Color (optional)">
            <Select value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="">None</option>
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormRow>
          {color === 'Custom' && (
            <div className="mt-2">
              <Label>Custom color</Label>
              <Input value={colorCustom} onChange={(e) => setColorCustom(e.target.value)} placeholder="e.g. Dusty rose" />
            </div>
          )}
        </div>
      </div>

      <FormRow label="Tags">
        <TagInput value={tags} onChange={setTags} />
      </FormRow>

      <FormRow label="Vendor (optional — for items sourced through a vendor rather than owned stock)">
        <Select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">None (owned stock)</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      </FormRow>

      {hasLegacyLocation && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This item hasn&apos;t been migrated to the new location system yet. Previous location:{' '}
          <span className="font-medium">{initial?.location || '—'}</span>
          {initial?.bin ? ` · ${initial.bin}` : ''}, qty {initial?.totalQuantity ?? 0}. Add storage entries below, or run the
          migration tool from the Locations page.
        </p>
      )}

      {vendorId ? (
        <FormRow label="Quantity (through this vendor)">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={vendorQuantity}
            onChange={(e) => setVendorQuantity(e.target.value)}
          />
        </FormRow>
      ) : (
        <StorageEntriesEditor entries={storageEntries} onChange={setStorageEntries} namePrefixDefault={name} />
      )}

      <FormRow label="Condition">
        <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </FormRow>

      <StatusPanel totalQuantity={totalQuantity} statusBreakdown={statusBreakdown} onChange={handleStatusChange} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Model (optional)">
          <Input value={model} onChange={(e) => setModel(e.target.value)} />
        </FormRow>
        <FormRow label="Dimensions (optional)">
          <Input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder={'60in dia x 30in H'} />
        </FormRow>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Cost price per unit (optional)">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            placeholder="0.00"
          />
        </FormRow>
        <FormRow label="Rental price per unit (optional)">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={rentalPrice}
            onChange={(e) => setRentalPrice(e.target.value)}
            placeholder="0.00"
          />
        </FormRow>
      </div>
      {costPrice.trim() !== '' && rentalPrice.trim() !== '' && (
        <p className="-mt-2 text-base text-gray-600">
          Gross profit per unit: <span className="font-medium text-charcoal">{formatCurrency(Number(rentalPrice) - Number(costPrice))}</span>
        </p>
      )}

      <FormRow label="Notes (optional — internal only)">
        <TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormRow>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px]">
          {confirmed ? 'Close' : 'Cancel'}
        </Button>
        <Button type="submit" disabled={saving || preparingDraft} className="min-h-[44px]">
          {preparingDraft ? 'Preparing…' : saving ? 'Saving…' : confirmed ? 'Save changes' : 'Create item'}
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="mb-2 text-base font-medium text-charcoal">Photos</p>
        {savedId ? (
          <PhotoUploader itemId={savedId} photos={photos} onChange={handlePhotosChange} />
        ) : preparingDraft ? (
          <p className="text-base text-gray-500">Preparing photo upload…</p>
        ) : (
          <p className="text-base text-gray-500">{draftError || 'Create the item first, then add photos.'}</p>
        )}
      </div>
    </form>
  )
}
