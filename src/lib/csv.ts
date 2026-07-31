import Papa from 'papaparse'
import { getItemTotalQuantity } from './inventoryStatus'
import { THROUGH_VENDOR_LOCATION_ID } from '../types'
import type { InventoryItem, LocationDoc, StorageEntry } from '../types'

const CSV_COLUMNS = [
  'id',
  'name',
  'description',
  'category',
  'material',
  'color',
  'colorCustom',
  'tags',
  'totalQuantity',
  'storageEntries',
  'condition',
  'statusGood',
  'statusNeedsRepair',
  'statusNeedsReplacement',
  'model',
  'notes',
  'dimensions',
  'costPrice',
  'rentalPrice',
  'vendorId',
  'photoUrls',
] as const

/** `LocationName>SubLocationName>Bin>Qty` segments joined by `;` — human-readable, round-trips through import. */
function serializeStorageEntries(item: InventoryItem, locationsById: Map<string, LocationDoc>): string {
  if (item.storageEntries?.length) {
    return item.storageEntries
      .map((e) => {
        const loc = locationsById.get(e.locationId)
        const sub = loc?.subLocations.find((s) => s.id === e.subLocationId)
        return `${loc?.name ?? ''}>${sub?.name ?? ''}>${e.bin ?? ''}>${e.quantity}`
      })
      .join(';')
  }
  // Not yet migrated — export the dormant legacy fields as a single unresolved entry, so this
  // export still works as a real backup even before the storage-entries migration has run.
  if (item.location || item.totalQuantity) {
    return `${item.location ?? ''}>>${item.bin ?? ''}>${item.totalQuantity ?? 0}`
  }
  return ''
}

export function exportInventoryCsv(items: InventoryItem[], locations: LocationDoc[]): string {
  const locationsById = new Map(locations.map((l) => [l.id, l]))
  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    category: i.category,
    material: i.material,
    color: i.color,
    colorCustom: i.colorCustom,
    tags: (i.tags || []).join(';'),
    totalQuantity: getItemTotalQuantity(i),
    storageEntries: serializeStorageEntries(i, locationsById),
    condition: i.condition,
    statusGood: i.statusBreakdown?.good ?? 0,
    statusNeedsRepair: i.statusBreakdown?.needsRepair ?? 0,
    statusNeedsReplacement: i.statusBreakdown?.needsReplacement ?? 0,
    model: i.model,
    notes: i.notes ?? '',
    dimensions: i.dimensions ?? '',
    costPrice: i.costPrice ?? '',
    rentalPrice: i.rentalPrice ?? '',
    vendorId: i.vendorId ?? '',
    photoUrls: (i.photos || []).map((p) => p.url).join(';'),
  }))
  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows })
}

export function downloadTextFile(filename: string, contents: string, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (err: Error) => reject(err),
    })
  })
}

export type ImportAction = 'create' | 'update'

export interface ImportPlanEntry {
  rowNumber: number
  action: ImportAction
  matchedId?: string
  data: {
    name: string
    description: string
    category: string
    material: string
    color: string
    colorCustom: string
    tags: string[]
    storageEntries: StorageEntry[]
    condition: string
    statusBreakdown: { good: number; needsRepair: number; needsReplacement: number }
    model: string
    notes: string
    dimensions: string
    costPrice: number | null
    rentalPrice: number | null
    vendorId: string
  }
  errors: string[]
}

function parseOptionalNumber(raw: string | undefined): number | null {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return null
  const n = Number(trimmed)
  return Number.isNaN(n) ? null : n
}

function parseTags(cell: string | undefined): string[] {
  if (!cell) return []
  return cell
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean)
}

function parseIntField(raw: string | undefined, fieldLabel: string, errors: string[]): number {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '') return 0
  const n = Number(trimmed)
  if (Number.isNaN(n)) {
    errors.push(`${fieldLabel} "${trimmed}" is not a number`)
    return 0
  }
  return n
}

function resolveLocationByName(name: string, locations: LocationDoc[]): LocationDoc | undefined {
  const trimmed = name.trim().toLowerCase()
  return locations.find((l) => l.name.trim().toLowerCase() === trimmed)
}

/** New-format cell: `LocationName>SubLocationName>Bin>Qty` segments joined by `;`. Unresolvable location/sub-location names are row errors, not silently created — keeps locations as controlled records. */
function parseStorageEntriesCell(cell: string, locations: LocationDoc[], errors: string[]): StorageEntry[] {
  const entries: StorageEntry[] = []
  const segments = cell
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
  for (const segment of segments) {
    const [locName = '', subName = '', bin = '', qtyRaw = ''] = segment.split('>')
    const loc = resolveLocationByName(locName, locations)
    if (!loc) {
      errors.push(`Location "${locName.trim()}" not found — create it on the Locations page first`)
      continue
    }
    let subLocationId: string | null = null
    if (subName.trim()) {
      const sub = loc.subLocations.find((s) => s.name.trim().toLowerCase() === subName.trim().toLowerCase())
      if (!sub) {
        errors.push(`Sub-location "${subName.trim()}" not found under "${loc.name}"`)
        continue
      }
      subLocationId = sub.id
    }
    const qty = Number(qtyRaw.trim())
    if (Number.isNaN(qty)) {
      errors.push(`Storage entry quantity "${qtyRaw.trim()}" is not a number`)
      continue
    }
    entries.push({ id: crypto.randomUUID(), locationId: loc.id, subLocationId, bin: bin.trim(), quantity: qty, packSize: null })
  }
  return entries
}

/** Legacy format: today's intake template's plain `location`/`bin`/`totalQuantity` columns, treated as one storage entry. */
function parseLegacyLocationColumns(row: Record<string, string>, locations: LocationDoc[], errors: string[]): StorageEntry[] {
  const locationName = (row.location || '').trim()
  const loc = resolveLocationByName(locationName, locations)
  if (!loc) {
    errors.push(`Location "${locationName}" not found — create it on the Locations page first`)
    return []
  }
  const qty = parseIntField(row.totalQuantity, 'totalQuantity', errors)
  return [{ id: crypto.randomUUID(), locationId: loc.id, subLocationId: null, bin: (row.bin || '').trim(), quantity: qty, packSize: null }]
}

export function buildImportPlan(
  rows: Record<string, string>[],
  existingItems: InventoryItem[],
  locations: LocationDoc[],
): ImportPlanEntry[] {
  const byId = new Map(existingItems.map((i) => [i.id, i]))

  return rows.map((row, idx) => {
    const errors: string[] = []
    const name = (row.name || '').trim()
    if (!name) errors.push('Missing name')

    const category = (row.category || '').trim()
    if (!category) errors.push('Missing category')

    const vendorId = (row.vendorId || '').trim()
    const hasNewFormat = (row.storageEntries || '').trim() !== ''
    const hasLegacyLocation = (row.location || '').trim() !== ''

    let storageEntries: StorageEntry[]
    if (hasNewFormat) {
      storageEntries = parseStorageEntriesCell(row.storageEntries, locations, errors)
    } else if (hasLegacyLocation) {
      storageEntries = parseLegacyLocationColumns(row, locations, errors)
    } else if (vendorId) {
      const qty = parseIntField(row.totalQuantity, 'totalQuantity', errors)
      storageEntries =
        qty > 0
          ? [{ id: crypto.randomUUID(), locationId: THROUGH_VENDOR_LOCATION_ID, subLocationId: null, bin: '', quantity: qty, packSize: null }]
          : []
    } else {
      errors.push('Missing location (or a vendorId for a vendor-sourced item)')
      storageEntries = []
    }

    const totalQuantity = storageEntries.reduce((sum, e) => sum + e.quantity, 0)
    const good = parseIntField(row.statusGood, 'statusGood', errors)
    const needsRepair = parseIntField(row.statusNeedsRepair, 'statusNeedsRepair', errors)
    const needsReplacement = parseIntField(row.statusNeedsReplacement, 'statusNeedsReplacement', errors)
    if (good + needsRepair + needsReplacement !== totalQuantity) {
      errors.push(
        `Status counts (${good} + ${needsRepair} + ${needsReplacement}) don't sum to the quantity from storage entries (${totalQuantity})`,
      )
    }

    const id = (row.id || '').trim()
    const matched = id ? byId.get(id) : undefined

    return {
      rowNumber: idx + 2,
      action: matched ? 'update' : 'create',
      matchedId: matched?.id,
      data: {
        name,
        description: row.description || '',
        category,
        material: row.material || '',
        color: row.color || '',
        colorCustom: row.colorCustom || '',
        tags: parseTags(row.tags),
        storageEntries,
        condition: row.condition || '',
        statusBreakdown: { good, needsRepair, needsReplacement },
        model: row.model || '',
        notes: row.notes || '',
        dimensions: row.dimensions || '',
        costPrice: parseOptionalNumber(row.costPrice),
        rentalPrice: parseOptionalNumber(row.rentalPrice),
        vendorId,
      },
      errors,
    }
  })
}
