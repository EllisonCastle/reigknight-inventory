import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, TextArea } from '../ui/Field'
import type { Venue } from '../../types'

export interface VenueFormValues {
  name: string
  description: string
  capacity: number | null
  photoUrl: string
}

interface VenueFormProps {
  initial?: Venue
  onCancel: () => void
  onSubmit: (values: VenueFormValues) => Promise<void>
}

export function VenueForm({ initial, onCancel, onSubmit }: VenueFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [capacity, setCapacity] = useState(initial?.capacity?.toString() ?? '')
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
        capacity: capacity.trim() === '' ? null : Number(capacity),
        photoUrl: photoUrl.trim(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormRow label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </FormRow>
      <FormRow label="Description">
        <TextArea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormRow>
      <FormRow label="Capacity">
        <Input type="number" min={0} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      </FormRow>
      <FormRow label="Photo URL (optional)">
        <Input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://…" />
      </FormRow>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save venue'}
        </Button>
      </div>
    </form>
  )
}
