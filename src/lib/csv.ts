import Papa from 'papaparse'
import type { InventoryItem } from '../types'

const CSV_COLUMNS = [
  'id',
  'name',
  'description',
  'tags',
  'color',
  'totalQuantity',
  'location',
  'model',
  'sku',
  'photoUrls',
] as const

export function exportInventoryCsv(items: InventoryItem[]): string {
  const rows = items.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    tags: (i.tags || []).join(';'),
    color: i.color,
    totalQuantity: i.totalQuantity,
    location: i.location,
    model: i.model,
    sku: i.sku,
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
    tags: string[]
    color: string
    totalQuantity: number
    location: string
    model: string
    sku: string
  }
  errors: string[]
}

function parseTags(cell: string | undefined): string[] {
  if (!cell) return []
  return cell
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean)
}

export function buildImportPlan(
  rows: Record<string, string>[],
  existingItems: InventoryItem[],
): ImportPlanEntry[] {
  const byId = new Map(existingItems.map((i) => [i.id, i]))
  const bySku = new Map(existingItems.filter((i) => i.sku).map((i) => [i.sku, i]))

  return rows.map((row, idx) => {
    const errors: string[] = []
    const name = (row.name || '').trim()
    if (!name) errors.push('Missing name')

    const totalQuantityRaw = (row.totalQuantity ?? '').trim()
    let totalQuantity = 0
    if (totalQuantityRaw !== '') {
      totalQuantity = Number(totalQuantityRaw)
      if (Number.isNaN(totalQuantity)) errors.push(`totalQuantity "${totalQuantityRaw}" is not a number`)
    }

    const id = (row.id || '').trim()
    const sku = (row.sku || '').trim()
    let matched: InventoryItem | undefined
    if (id && byId.has(id)) matched = byId.get(id)
    else if (sku && bySku.has(sku)) matched = bySku.get(sku)

    return {
      rowNumber: idx + 2,
      action: matched ? 'update' : 'create',
      matchedId: matched?.id,
      data: {
        name,
        description: row.description || '',
        tags: parseTags(row.tags),
        color: row.color || '',
        totalQuantity,
        location: row.location || '',
        model: row.model || '',
        sku,
      },
      errors,
    }
  })
}
