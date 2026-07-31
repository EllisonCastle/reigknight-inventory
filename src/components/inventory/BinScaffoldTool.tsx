import { useState } from 'react'
import { Button } from '../ui/Button'
import { FormRow, Input, Select } from '../ui/Field'
import type { LocationDoc, StorageEntry } from '../../types'

interface ScaffoldRow {
  id: string
  name: string
  quantity: number
}

interface BinScaffoldToolProps {
  locations: LocationDoc[]
  namePrefixDefault?: string
  onConfirm: (entries: StorageEntry[]) => void
  onCancel: () => void
}

function suffixFor(i: number): string {
  return i < 26 ? String.fromCharCode(65 + i) : String(i + 1)
}

function generateRows(prefix: string, quantity: number, packSize: number): ScaffoldRow[] {
  if (quantity <= 0 || packSize <= 0) return []
  const numBins = Math.ceil(quantity / packSize)
  const rows: ScaffoldRow[] = []
  let remaining = quantity
  for (let i = 0; i < numBins; i++) {
    const qty = Math.min(packSize, remaining)
    rows.push({ id: crypto.randomUUID(), name: `${prefix}-${suffixFor(i)}`, quantity: qty })
    remaining -= qty
  }
  return rows
}

/** Quantity + pack size → suggested bin rows (e.g. 30-A, 30-B…), editable before confirming into real storage entries. */
export function BinScaffoldTool({ locations, namePrefixDefault, onConfirm, onCancel }: BinScaffoldToolProps) {
  const [locationId, setLocationId] = useState('')
  const [subLocationId, setSubLocationId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState('')
  const [packSize, setPackSize] = useState('')
  const [prefix, setPrefix] = useState(namePrefixDefault ?? '')
  const [rows, setRows] = useState<ScaffoldRow[] | null>(null)

  const location = locations.find((l) => l.id === locationId)

  const handleGenerate = () => {
    const qty = Number(quantity) || 0
    const pack = Number(packSize) || 0
    setRows(generateRows(prefix.trim() || 'Bin', qty, pack))
  }

  const updateRow = (id: string, patch: Partial<ScaffoldRow>) => {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev))
  }

  const removeRow = (id: string) => {
    setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev))
  }

  const handleConfirm = () => {
    if (!rows || !locationId) return
    const pack = Number(packSize) || null
    const entries: StorageEntry[] = rows
      .filter((r) => r.quantity > 0)
      .map((r) => ({
        id: crypto.randomUUID(),
        locationId,
        subLocationId,
        bin: r.name.trim(),
        quantity: r.quantity,
        packSize: pack,
      }))
    onConfirm(entries)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-base text-gray-600">
        Split a quantity into evenly-packed bins with suggested names — rename or adjust before adding.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormRow label="Location">
          <Select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value)
              setSubLocationId(null)
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
        {location && location.subLocations.length > 0 && (
          <FormRow label="Sub-location (optional)">
            <Select value={subLocationId ?? ''} onChange={(e) => setSubLocationId(e.target.value || null)}>
              <option value="">None</option>
              {location.subLocations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormRow>
        )}
        <FormRow label="Total quantity to split">
          <Input type="number" inputMode="numeric" min={0} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </FormRow>
        <FormRow label="Units per bin (pack size)">
          <Input type="number" inputMode="numeric" min={1} value={packSize} onChange={(e) => setPackSize(e.target.value)} />
        </FormRow>
        <FormRow label="Bin name prefix">
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="30" />
        </FormRow>
      </div>

      <Button type="button" variant="secondary" disabled={!locationId || !quantity || !packSize} onClick={handleGenerate}>
        Generate bins
      </Button>

      {rows && (
        <div className="flex flex-col gap-2">
          {rows.length === 0 ? (
            <p className="text-base text-gray-500">Enter a quantity and pack size to generate bins.</p>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Input value={row.name} onChange={(e) => updateRow(row.id, { name: e.target.value })} />
                </div>
                <div className="w-24 shrink-0">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove bin"
                  className="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-surface hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 border-t border-gray-200 pt-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={!rows || rows.length === 0} onClick={handleConfirm}>
          Add {rows?.length ?? 0} bins
        </Button>
      </div>
    </div>
  )
}
