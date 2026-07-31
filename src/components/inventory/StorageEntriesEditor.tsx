import { useState } from 'react'
import { useLocations } from '../../hooks/useLocations'
import { Button } from '../ui/Button'
import { Input, Label, Select } from '../ui/Field'
import { Modal } from '../ui/Modal'
import { BinScaffoldTool } from './BinScaffoldTool'
import type { StorageEntry } from '../../types'

interface StorageEntriesEditorProps {
  entries: StorageEntry[]
  onChange: (next: StorageEntry[]) => void
  namePrefixDefault?: string
}

export function StorageEntriesEditor({ entries, onChange, namePrefixDefault }: StorageEntriesEditorProps) {
  const { locations } = useLocations()
  const [scaffoldOpen, setScaffoldOpen] = useState(false)

  const updateEntry = (id: string, patch: Partial<StorageEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const removeEntry = (id: string) => {
    onChange(entries.filter((e) => e.id !== id))
  }

  const addBlankEntry = () => {
    onChange([...entries, { id: crypto.randomUUID(), locationId: '', subLocationId: null, bin: '', quantity: 0, packSize: null }])
  }

  const handleScaffoldConfirm = (newEntries: StorageEntry[]) => {
    onChange([...entries, ...newEntries])
    setScaffoldOpen(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Storage locations</Label>
      {entries.length === 0 && <p className="text-base text-gray-500">No storage entries yet — add at least one.</p>}
      {entries.map((entry) => {
        const location = locations.find((l) => l.id === entry.locationId)
        return (
          <div key={entry.id} className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 p-3">
            <div className="min-w-[140px] flex-1">
              <Label>Location</Label>
              <Select
                value={entry.locationId}
                onChange={(e) => updateEntry(entry.id, { locationId: e.target.value, subLocationId: null })}
              >
                <option value="">Select location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            {location && location.subLocations.length > 0 && (
              <div className="min-w-[140px] flex-1">
                <Label>Sub-location</Label>
                <Select
                  value={entry.subLocationId ?? ''}
                  onChange={(e) => updateEntry(entry.id, { subLocationId: e.target.value || null })}
                >
                  <option value="">No sub-location</option>
                  {location.subLocations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="min-w-[100px] flex-1">
              <Label>Bin (optional)</Label>
              <Input value={entry.bin} onChange={(e) => updateEntry(entry.id, { bin: e.target.value })} placeholder="Bin 17…" />
            </div>
            <div className="w-24">
              <Label>Qty</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={entry.quantity}
                onChange={(e) => updateEntry(entry.id, { quantity: Math.max(0, Number(e.target.value) || 0) })}
              />
            </div>
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              aria-label="Remove storage entry"
              className="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-surface hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addBlankEntry}>
          + Add storage entry
        </Button>
        <Button type="button" variant="secondary" onClick={() => setScaffoldOpen(true)}>
          Split into bins…
        </Button>
      </div>

      <Modal open={scaffoldOpen} onClose={() => setScaffoldOpen(false)} title="Split into bins" wide>
        <BinScaffoldTool
          locations={locations}
          namePrefixDefault={namePrefixDefault}
          onConfirm={handleScaffoldConfirm}
          onCancel={() => setScaffoldOpen(false)}
        />
      </Modal>
    </div>
  )
}
