import { useState } from 'react'
import { useLocations } from '../../hooks/useLocations'
import { Button } from '../ui/Button'
import { FormRow, Select } from '../ui/Field'

interface BatchMoveFormProps {
  sourceLocationName: string
  itemCount: number
  onCancel: () => void
  onConfirm: (targetLocationId: string, targetSubLocationId: string | null) => Promise<void>
}

export function BatchMoveForm({ sourceLocationName, itemCount, onCancel, onConfirm }: BatchMoveFormProps) {
  const { locations } = useLocations()
  const [targetLocationId, setTargetLocationId] = useState('')
  const [targetSubLocationId, setTargetSubLocationId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const targetLocation = locations.find((l) => l.id === targetLocationId)

  const handleConfirm = async () => {
    if (!targetLocationId) {
      setError('Choose a destination location.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onConfirm(targetLocationId, targetSubLocationId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-gray-600">
        Move {itemCount} item{itemCount === 1 ? '' : 's'} out of <span className="font-medium text-charcoal">{sourceLocationName}</span> to:
      </p>
      <FormRow label="Destination location">
        <Select
          value={targetLocationId}
          onChange={(e) => {
            setTargetLocationId(e.target.value)
            setTargetSubLocationId(null)
          }}
        >
          <option value="">Select location…</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </FormRow>
      {targetLocation && targetLocation.subLocations.length > 0 && (
        <FormRow label="Sub-location (optional)">
          <Select value={targetSubLocationId ?? ''} onChange={(e) => setTargetSubLocationId(e.target.value || null)}>
            <option value="">No sub-location</option>
            {targetLocation.subLocations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </FormRow>
      )}
      <p className="text-sm text-gray-500">
        Bins are location-specific, so each moved item&apos;s bin is cleared — re-bin at the new spot once they land.
      </p>
      {error && <p className="text-base text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={saving}>
          {saving ? 'Moving…' : `Move ${itemCount} item${itemCount === 1 ? '' : 's'}`}
        </Button>
      </div>
    </div>
  )
}
