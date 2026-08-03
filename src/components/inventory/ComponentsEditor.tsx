import { Button } from '../ui/Button'
import { Input, Label, Select } from '../ui/Field'
import type { InventoryItem, KitComponent } from '../../types'

interface ComponentsEditorProps {
  items: InventoryItem[]
  excludeItemId?: string
  components: KitComponent[]
  onChange: (next: KitComponent[]) => void
}

/** Editable bill-of-materials for a kit: which items (and how many of each) get pulled whenever this item is reserved. */
export function ComponentsEditor({ items, excludeItemId, components, onChange }: ComponentsEditorProps) {
  const options = [...items].filter((i) => i.id !== excludeItemId).sort((a, b) => a.name.localeCompare(b.name))

  const updateRow = (index: number, patch: Partial<KitComponent>) => {
    onChange(components.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  const removeRow = (index: number) => {
    onChange(components.filter((_, i) => i !== index))
  }

  const addRow = () => {
    onChange([...components, { childItemId: options[0]?.id ?? '', quantityPerUnit: 1 }])
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>Components (optional — for kits that pull other items when reserved)</Label>
      {components.length === 0 && <p className="text-base text-gray-500">No components.</p>}
      {components.map((c, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-md border border-gray-200 p-3">
          <div className="min-w-[180px] flex-1">
            <Label>Child item</Label>
            <Select value={c.childItemId} onChange={(e) => updateRow(i, { childItemId: e.target.value })}>
              <option value="">Select item…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-32">
            <Label>Qty per unit</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              value={c.quantityPerUnit}
              onChange={(e) => updateRow(i, { quantityPerUnit: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <button
            type="button"
            onClick={() => removeRow(i)}
            aria-label="Remove component"
            className="flex h-11 w-11 items-center justify-center rounded-md text-gray-400 hover:bg-surface hover:text-red-600"
          >
            ✕
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" onClick={addRow} disabled={options.length === 0}>
        + Add component
      </Button>
    </div>
  )
}
