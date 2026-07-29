import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Label, Select, TextArea } from '../ui/Field'
import { PhotoUploader } from './PhotoUploader'
import { TagInput } from './TagInput'
import { ItemPresetPicker } from './ItemPresetPicker'
import { StatusPanel } from './StatusPanel'
import { CATEGORIES, COLORS, CONDITIONS, MATERIALS } from '../../constants/inventory'
import { rebalanceForNewTotal, validateStatusCounts } from '../../lib/inventoryStatus'
import type { InventoryItem, InventoryPhoto, StatusBreakdown } from '../../types'
import type { ItemPreset } from '../../constants/itemPresets'

export interface InventoryFormFields {
  name: string
  description: string
  category: string
  material: string
  color: string
  colorCustom: string
  tags: string[]
  totalQuantity: number
  location: string
  bin: string
  condition: string
  statusBreakdown: StatusBreakdown
  model: string
}

interface InventoryFormProps {
  initial?: InventoryItem
  onCancel: () => void
  onCreate: (data: InventoryFormFields) => Promise<string>
  onUpdate: (id: string, data: Partial<InventoryFormFields>) => Promise<void>
  onPhotosChange: (id: string, photos: InventoryPhoto[]) => Promise<void>
}

const emptyStatus: StatusBreakdown = { good: 0, needsRepair: 0, needsReplacement: 0 }

export function InventoryForm({ initial, onCancel, onCreate, onUpdate, onPhotosChange }: InventoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [material, setMaterial] = useState(initial?.material ?? '')
  const [color, setColor] = useState(initial?.color ?? '')
  const [colorCustom, setColorCustom] = useState(initial?.colorCustom ?? '')
  const [tags, setTags] = useState<string[]>(initial?.tags ?? [])
  const [totalQuantity, setTotalQuantity] = useState(initial?.totalQuantity ?? 0)
  const [location, setLocation] = useState(initial?.location ?? '')
  const [bin, setBin] = useState(initial?.bin ?? '')
  const [condition, setCondition] = useState(initial?.condition ?? 'Good')
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>(
    initial?.statusBreakdown ?? { ...emptyStatus, good: initial?.totalQuantity ?? 0 },
  )
  const [model, setModel] = useState(initial?.model ?? '')

  const [savedId, setSavedId] = useState<string | undefined>(initial?.id)
  const [photos, setPhotos] = useState<InventoryPhoto[]>(initial?.photos ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handlePresetSelect = (preset: ItemPreset) => {
    setName(preset.name)
    setCategory(preset.category)
    setMaterial(preset.material)
    setDescription(preset.description)
  }

  const handleTotalQuantityChange = (raw: string) => {
    const next = Math.max(0, Number(raw) || 0)
    setStatusBreakdown((prev) => rebalanceForNewTotal(prev, totalQuantity, next))
    setTotalQuantity(next)
  }

  const handleStatusChange = (next: StatusBreakdown, totalQuantityDelta?: number) => {
    setStatusBreakdown(next)
    if (totalQuantityDelta) {
      setTotalQuantity((t) => t + totalQuantityDelta)
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
    totalQuantity,
    location: location.trim(),
    bin: bin.trim(),
    condition,
    statusBreakdown,
    model: model.trim(),
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Name is required.')
    if (!category) return setError('Category is required.')
    if (!location.trim()) return setError('Location is required.')

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
        setSavedId(id)
      }
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Barn Shed…" required />
        </FormRow>
        <FormRow label="Bin (optional)">
          <Input value={bin} onChange={(e) => setBin(e.target.value)} placeholder="Bin 17, Shelf B-3…" />
        </FormRow>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Total quantity owned">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={totalQuantity}
            onChange={(e) => handleTotalQuantityChange(e.target.value)}
          />
        </FormRow>
        <FormRow label="Condition">
          <Select value={condition} onChange={(e) => setCondition(e.target.value)}>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </FormRow>
      </div>

      <StatusPanel totalQuantity={totalQuantity} statusBreakdown={statusBreakdown} onChange={handleStatusChange} />

      <FormRow label="Model (optional)">
        <Input value={model} onChange={(e) => setModel(e.target.value)} />
      </FormRow>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} className="min-h-[44px]">
          {savedId ? 'Close' : 'Cancel'}
        </Button>
        <Button type="submit" disabled={saving} className="min-h-[44px]">
          {saving ? 'Saving…' : savedId ? 'Save changes' : 'Create item'}
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="mb-2 text-base font-medium text-charcoal">Photos</p>
        {savedId ? (
          <PhotoUploader itemId={savedId} photos={photos} onChange={handlePhotosChange} />
        ) : (
          <p className="text-base text-gray-500">Create the item first, then add photos.</p>
        )}
      </div>
    </form>
  )
}
