import { useMemo } from 'react'
import { Input, Select } from '../ui/Field'
import type { InventoryItem } from '../../types'

export interface InventoryFilterState {
  search: string
  tags: string[]
  color: string
  location: string
}

interface InventoryFiltersProps {
  items: InventoryItem[]
  value: InventoryFilterState
  onChange: (next: InventoryFilterState) => void
}

export function InventoryFilters({ items, value, onChange }: InventoryFiltersProps) {
  const allTags = useMemo(
    () => Array.from(new Set(items.flatMap((i) => i.tags ?? []))).sort(),
    [items],
  )
  const allColors = useMemo(
    () => Array.from(new Set(items.map((i) => i.color).filter(Boolean))).sort(),
    [items],
  )
  const allLocations = useMemo(
    () => Array.from(new Set(items.map((i) => i.location).filter(Boolean))).sort(),
    [items],
  )

  const toggleTag = (tag: string) => {
    const next = value.tags.includes(tag) ? value.tags.filter((t) => t !== tag) : [...value.tags, tag]
    onChange({ ...value, tags: next })
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or description…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="max-w-xs"
        />
        <Select
          value={value.color}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
          className="max-w-[10rem]"
        >
          <option value="">All colors</option>
          {allColors.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          value={value.location}
          onChange={(e) => onChange({ ...value, location: e.target.value })}
          className="max-w-[10rem]"
        >
          <option value="">All locations</option>
          {allLocations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        {(value.search || value.color || value.location || value.tags.length > 0) && (
          <button
            onClick={() => onChange({ search: '', tags: [], color: '', location: '' })}
            className="text-sm font-medium text-regal hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => {
            const active = value.tags.includes(tag)
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                  active ? 'border-regal bg-regal-light text-regal' : 'border-gray-200 text-gray-600 hover:bg-surface'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function applyInventoryFilters(items: InventoryItem[], filters: InventoryFilterState): InventoryItem[] {
  const search = filters.search.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.color && item.color !== filters.color) return false
    if (filters.location && item.location !== filters.location) return false
    if (filters.tags.length > 0 && !filters.tags.some((t) => item.tags?.includes(t))) return false
    if (search) {
      const haystack = `${item.name} ${item.description}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
}
