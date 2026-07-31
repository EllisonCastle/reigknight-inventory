import Papa from 'papaparse'
import type { InventoryItem } from '../types'

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
  'location',
  'bin',
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

export function exportInventoryCsv(items: InventoryItem[]): string {
  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    category: i.category,
    material: i.material,
    color: i.color,
    colorCustom: i.colorCustom,
    tags: (i.tags || []).join(';'),
    totalQuantity: i.totalQuantity,
    location: i.location,
    bin: i.bin,
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
    totalQuantity: number
    location: string
    bin: string
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

export function buildImportPlan(
  rows: Record<string, string>[],
  existingItems: InventoryItem[],
): ImportPlanEntry[] {
  const byId = new Map(existingItems.map((i) => [i.id, i]))

  return rows.map((row, idx) => {
    const errors: string[] = []
    const name = (row.name || '').trim()
    if (!name) errors.push('Missing name')

    const category = (row.category || '').trim()
    if (!category) errors.push('Missing category')

    const location = (row.location || '').trim()
    if (!location) errors.push('Missing location')

    const totalQuantity = parseIntField(row.totalQuantity, 'totalQuantity', errors)
    const good = parseIntField(row.statusGood, 'statusGood', errors)
    const needsRepair = parseIntField(row.statusNeedsRepair, 'statusNeedsRepair', errors)
    const needsReplacement = parseIntField(row.statusNeedsReplacement, 'statusNeedsReplacement', errors)
    if (good + needsRepair + needsReplacement !== totalQuantity) {
      errors.push(
        `Status counts (${good} + ${needsRepair} + ${needsReplacement}) don't sum to totalQuantity (${totalQuantity})`,
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
        totalQuantity,
        location,
        bin: row.bin || '',
        condition: row.condition || '',
        statusBreakdown: { good, needsRepair, needsReplacement },
        model: row.model || '',
        notes: row.notes || '',
        dimensions: row.dimensions || '',
        costPrice: parseOptionalNumber(row.costPrice),
        rentalPrice: parseOptionalNumber(row.rentalPrice),
        vendorId: row.vendorId || '',
      },
      errors,
    }
  })
}
