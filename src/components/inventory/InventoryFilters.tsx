import { useMemo, useState } from 'react'
import { Input, Select } from '../ui/Field'
import { Button } from '../ui/Button'
import { BottomSheet } from '../ui/BottomSheet'
import { Popover } from '../ui/Popover'
import { CATEGORIES, COLORS, CONDITIONS, MATERIALS } from '../../constants/inventory'
import { needsAttention } from '../../lib/inventoryStatus'
import { useLocations } from '../../hooks/useLocations'
import type { InventoryItem, LocationDoc } from '../../types'

export interface InventoryFilterState {
  search: string
  category: string
  material: string
  color: string
  tags: string[]
  locationId: string
  bin: string
  condition: string
  attentionOnly: boolean
}

export const emptyInventoryFilters: InventoryFilterState = {
  search: '',
  category: '',
  material: '',
  color: '',
  tags: [],
  locationId: '',
  bin: '',
  condition: '',
  attentionOnly: false,
}

export type InventorySortKey = 'name' | 'category' | 'needsWork' | 'condition' | 'location' | 'updatedAt' | 'createdAt'

export const SORT_OPTIONS: { value: InventorySortKey; label: string }[] = [
  { value: 'updatedAt', label: 'Last modified' },
  { value: 'createdAt', label: 'Recently created' },
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'needsWork', label: 'Needs work most' },
  { value: 'condition', label: 'Condition' },
  { value: 'location', label: 'Location' },
]

interface InventoryFiltersProps {
  items: InventoryItem[]
  value: InventoryFilterState
  onChange: (next: InventoryFilterState) => void
  sort: InventorySortKey
  onSortChange: (sort: InventorySortKey) => void
}

/** Counts only the filters that live inside the Filter-by panel — search and the attention toggle stay on the main bar and are already visibly active on their own. */
function countActiveFilters(f: InventoryFilterState): number {
  let n = 0
  if (f.category) n++
  if (f.material) n++
  if (f.color) n++
  if (f.tags.length > 0) n++
  if (f.locationId) n++
  if (f.bin) n++
  if (f.condition) n++
  return n
}

/** Free-text bins on each item's storage entries — falls back to the dormant legacy `bin` for items not yet migrated. */
function itemBins(item: InventoryItem): string[] {
  if (item.storageEntries?.length) return item.storageEntries.map((e) => e.bin).filter(Boolean)
  return item.bin ? [item.bin] : []
}

export function InventoryFilters({ items, value, onChange, sort, onSortChange }: InventoryFiltersProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const { locations } = useLocations()

  const allTags = useMemo(() => Array.from(new Set(items.flatMap((i) => i.tags ?? []))).sort(), [items])
  const allBins = useMemo(() => Array.from(new Set(items.flatMap(itemBins))).sort(), [items])

  const toggleTag = (tag: string) => {
    const next = value.tags.includes(tag) ? value.tags.filter((t) => t !== tag) : [...value.tags, tag]
    onChange({ ...value, tags: next })
  }

  const activeCount = countActiveFilters(value)

  const panelContent = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={value.material} onChange={(e) => onChange({ ...value, material: e.target.value })}>
          <option value="">All materials</option>
          {MATERIALS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select value={value.color} onChange={(e) => onChange({ ...value, color: e.target.value })}>
          <option value="">All colors</option>
          {COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={value.locationId} onChange={(e) => onChange({ ...value, locationId: e.target.value })}>
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select value={value.bin} onChange={(e) => onChange({ ...value, bin: e.target.value })}>
          <option value="">All bins</option>
          {allBins.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Select value={value.condition} onChange={(e) => onChange({ ...value, condition: e.target.value })}>
          <option value="">All conditions</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => {
            const active = value.tags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`min-h-[44px] rounded-full border px-3 text-sm font-medium ${
                  active ? 'border-regal bg-regal-light text-regal' : 'border-gray-200 text-gray-600 hover:bg-surface'
                }`}
              >
                {tag}
              </button>
            )
          })}
        </div>
      )}

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() => onChange({ ...emptyInventoryFilters, search: value.search, attentionOnly: value.attentionOnly })}
          className="min-h-[44px] self-start text-base font-medium text-regal hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="min-w-0 flex-1 sm:min-w-[220px]">
        <Input
          placeholder="Search name, description, or bin…"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>

      <div className="w-full sm:w-56">
        <Select value={sort} onChange={(e) => onSortChange(e.target.value as InventorySortKey)}>
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="relative">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPanelOpen((v) => !v)}
          className="min-h-[44px] w-full sm:w-auto"
        >
          Filter by {activeCount > 0 ? `(${activeCount})` : ''}
        </Button>

        <div className="hidden sm:block">
          <Popover open={panelOpen} onClose={() => setPanelOpen(false)}>
            {panelContent}
          </Popover>
        </div>
      </div>

      <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-base text-charcoal">
        <input
          type="checkbox"
          checked={value.attentionOnly}
          onChange={(e) => onChange({ ...value, attentionOnly: e.target.checked })}
          className="h-5 w-5"
        />
        Show only items needing attention
      </label>

      <div className="sm:hidden">
        <BottomSheet open={panelOpen} onClose={() => setPanelOpen(false)} title="Filter by">
          {panelContent}
          <Button type="button" onClick={() => setPanelOpen(false)} className="mt-4 min-h-[44px] w-full">
            Show results
          </Button>
        </BottomSheet>
      </div>
    </div>
  )
}

export function applyInventoryFilters(items: InventoryItem[], filters: InventoryFilterState): InventoryItem[] {
  const search = filters.search.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false
    if (filters.material && item.material !== filters.material) return false
    if (filters.color && item.color !== filters.color) return false
    if (filters.locationId && !(item.storageEntries ?? []).some((e) => e.locationId === filters.locationId)) return false
    if (filters.bin && !itemBins(item).includes(filters.bin)) return false
    if (filters.condition && item.condition !== filters.condition) return false
    if (filters.tags.length > 0 && !filters.tags.some((t) => item.tags?.includes(t))) return false
    if (filters.attentionOnly && !needsAttention(item)) return false
    if (search) {
      const haystack = `${item.name} ${item.description} ${itemBins(item).join(' ')}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })
}

export function applyInventorySort(
  items: InventoryItem[],
  sort: InventorySortKey,
  locationsById?: Map<string, LocationDoc>,
): InventoryItem[] {
  const sorted = [...items]
  switch (sort) {
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'category':
      return sorted.sort((a, b) => a.category.localeCompare(b.category))
    case 'condition':
      return sorted.sort((a, b) => a.condition.localeCompare(b.condition))
    case 'location': {
      // Multi-location items sort by their first storage entry's resolved name.
      const nameFor = (item: InventoryItem): string => {
        const entry = item.storageEntries?.[0]
        if (entry) return locationsById?.get(entry.locationId)?.name ?? ''
        return item.location ?? ''
      }
      return sorted.sort((a, b) => nameFor(a).localeCompare(nameFor(b)))
    }
    case 'needsWork':
      return sorted.sort((a, b) => {
        const aWork = a.statusBreakdown.needsRepair + a.statusBreakdown.needsReplacement
        const bWork = b.statusBreakdown.needsRepair + b.statusBreakdown.needsReplacement
        return bWork - aWork
      })
    case 'updatedAt':
      return sorted.sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
    case 'createdAt':
      return sorted.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
    default:
      return sorted
  }
}
