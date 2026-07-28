import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, TextArea } from '../ui/Field'
import { PhotoUploader } from './PhotoUploader'
import type { InventoryItem, InventoryPhoto } from '../../types'

export interface InventoryFormFields {
  name: string
  description: string
  tags: string[]
  color: string
  totalQuantity: number
  location: string
  model: string
  sku: string
}

interface InventoryFormProps {
  initial?: InventoryItem
  onCancel: () => void
  onCreate: (data: InventoryFormFields) => Promise<string>
  onUpdate: (id: string, data: Partial<InventoryFormFields>) => Promise<void>
  onPhotosChange: (id: string, photos: InventoryPhoto[]) => Promise<void>
}

export function InventoryForm({ initial, onCancel, onCreate, onUpdate, onPhotosChange }: InventoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [tagsInput, setTagsInput] = useState((initial?.tags ?? []).join(', '))
  const [color, setColor] = useState(initial?.color ?? '')
  const [totalQuantity, setTotalQuantity] = useState(initial?.totalQuantity?.toString() ?? '0')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [model, setModel] = useState(initial?.model ?? '')
  const [sku, setSku] = useState(initial?.sku ?? '')

  const [savedId, setSavedId] = useState<string | undefined>(initial?.id)
  const [photos, setPhotos] = useState<InventoryPhoto[]>(initial?.photos ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const buildFields = (): InventoryFormFields => ({
    name: name.trim(),
    description: description.trim(),
    tags: tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    color: color.trim(),
    totalQuantity: Number(totalQuantity) || 0,
    location: location.trim(),
    model: model.trim(),
    sku: sku.trim(),
  })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
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
      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </FormRow>
        <FormRow label="Color">
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Gold, White…" />
        </FormRow>
      </div>

      <FormRow label="Description">
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormRow>

      <FormRow label="Tags (comma-separated)">
        <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="rustic, outdoor, gold" />
      </FormRow>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Total quantity owned">
          <Input type="number" min={0} value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} />
        </FormRow>
        <FormRow label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Barn Shed…" />
        </FormRow>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormRow label="Model (optional)">
          <Input value={model} onChange={(e) => setModel(e.target.value)} />
        </FormRow>
        <FormRow label="SKU (optional)">
          <Input value={sku} onChange={(e) => setSku(e.target.value)} />
        </FormRow>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="mt-1 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {savedId ? 'Close' : 'Cancel'}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : savedId ? 'Save changes' : 'Create item'}
        </Button>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <p className="mb-2 text-sm font-medium text-charcoal">Photos</p>
        {savedId ? (
          <PhotoUploader itemId={savedId} photos={photos} onChange={handlePhotosChange} />
        ) : (
          <p className="text-sm text-gray-500">Create the item first, then add photos.</p>
        )}
      </div>
    </form>
  )
}
