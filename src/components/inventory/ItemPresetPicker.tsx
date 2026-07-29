import { useState } from 'react'
import { ITEM_PRESETS, type ItemPreset } from '../../constants/itemPresets'
import { Input, Label } from '../ui/Field'

interface ItemPresetPickerProps {
  onSelect: (preset: ItemPreset) => void
}

export function ItemPresetPicker({ onSelect }: ItemPresetPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const matches = ITEM_PRESETS.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)

  return (
    <div className="relative rounded-lg border border-dashed border-gray-300 bg-surface p-3">
      <Label>Start from a common item (optional)</Label>
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search common rental items…"
      />
      {open && matches.length > 0 && (
        <ul className="absolute inset-x-3 top-[68px] z-20 max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {matches.map((preset) => (
            <li key={preset.name}>
              <button
                type="button"
                onMouseDown={() => {
                  onSelect(preset)
                  setQuery('')
                  setOpen(false)
                }}
                className="flex w-full min-h-[44px] flex-col items-start px-3 py-2 text-left hover:bg-surface"
              >
                <span className="text-base font-medium text-charcoal">{preset.name}</span>
                <span className="text-sm text-gray-500">
                  {preset.category} · {preset.material}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-sm text-gray-500">Picking one fills in the name, category, material, and description below — edit anything after.</p>
    </div>
  )
}
