import { useState, type FormEvent } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Select } from '../ui/Field'
import type { LocationDoc } from '../../types'

export interface LocationFormValues {
  name: string
  type: LocationDoc['type']
}

interface LocationFormProps {
  initial?: LocationDoc
  itemCountForSubLocation?: (subLocationId: string) => number
  onCancel: () => void
  onSubmit: (values: LocationFormValues) => Promise<void>
  onAddSubLocation?: (name: string) => Promise<void>
  onRenameSubLocation?: (subLocationId: string, name: string) => Promise<void>
  onRemoveSubLocation?: (subLocationId: string) => Promise<void>
}

export function LocationForm({
  initial,
  itemCountForSubLocation,
  onCancel,
  onSubmit,
  onAddSubLocation,
  onRenameSubLocation,
  onRemoveSubLocation,
}: LocationFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<LocationDoc['type']>(initial?.type ?? 'standard')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [newSubName, setNewSubName] = useState('')
  const [addingSub, setAddingSub] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [subError, setSubError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Location name is required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), type })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  const handleAddSub = async () => {
    if (!newSubName.trim() || !onAddSubLocation) return
    setAddingSub(true)
    setSubError('')
    try {
      await onAddSubLocation(newSubName)
      setNewSubName('')
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setAddingSub(false)
    }
  }

  const handleRename = async (subLocationId: string) => {
    if (!renameValue.trim() || !onRenameSubLocation) return
    try {
      await onRenameSubLocation(subLocationId, renameValue)
      setRenamingId(null)
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  const handleRemove = async (subLocationId: string, subLocationName: string) => {
    if (!onRemoveSubLocation) return
    const count = itemCountForSubLocation?.(subLocationId) ?? 0
    if (count > 0) {
      setSubError(`${count} item${count === 1 ? ' is' : 's are'} still in "${subLocationName}" — move them first.`)
      return
    }
    if (!confirm(`Remove sub-location "${subLocationName}"?`)) return
    setSubError('')
    try {
      await onRemoveSubLocation(subLocationId)
    } catch (err) {
      setSubError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormRow label="Location name">
        <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Office, Barn Shed…" />
      </FormRow>
      <FormRow label="Type">
        <Select value={type} onChange={(e) => setType(e.target.value as LocationDoc['type'])}>
          <option value="standard">Standard</option>
          <option value="vendor">Vendor</option>
        </Select>
      </FormRow>

      {error && <p className="text-base text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save location'}
        </Button>
      </div>

      {initial ? (
        <div className="border-t border-gray-200 pt-4">
          <p className="mb-2 text-base font-medium text-charcoal">Sub-locations</p>
          {initial.subLocations.length === 0 ? (
            <p className="mb-2 text-sm text-gray-500">None yet.</p>
          ) : (
            <ul className="mb-2 flex flex-col gap-1">
              {initial.subLocations.map((sub) => (
                <li key={sub.id} className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
                  {renamingId === sub.id ? (
                    <>
                      <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="flex-1" autoFocus />
                      <button
                        type="button"
                        onClick={() => handleRename(sub.id)}
                        className="min-h-[44px] px-2 text-sm font-medium text-regal hover:underline"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setRenamingId(null)}
                        className="min-h-[44px] px-2 text-sm text-gray-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-base text-charcoal">{sub.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setRenamingId(sub.id)
                          setRenameValue(sub.name)
                        }}
                        className="min-h-[44px] px-2 text-sm font-medium text-regal hover:underline"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(sub.id, sub.name)}
                        className="min-h-[44px] px-2 text-sm font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {subError && <p className="mb-2 text-sm text-red-600">{subError}</p>}
          <div className="flex gap-2">
            <Input
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              placeholder="Cage, Marketing Room, Kitchen…"
              className="flex-1"
            />
            <Button type="button" variant="secondary" disabled={addingSub || !newSubName.trim()} onClick={handleAddSub}>
              {addingSub ? 'Adding…' : '+ Add'}
            </Button>
          </div>
        </div>
      ) : (
        <p className="border-t border-gray-200 pt-4 text-sm text-gray-500">
          Save this location first, then add sub-locations.
        </p>
      )}
    </form>
  )
}
