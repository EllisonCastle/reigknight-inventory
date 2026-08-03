import { availableForRental } from './inventoryStatus'
import type { InventoryItem, KitComponent } from '../types'

/** Defaults to 'stocked' for items predating Checkpoint 4. */
export function getStockType(item: Pick<InventoryItem, 'stockType'>): 'stocked' | 'bundle' {
  return item.stockType ?? 'stocked'
}

/** Defaults to no components for items predating Checkpoint 4. */
export function getComponents(item: Pick<InventoryItem, 'components'>): KitComponent[] {
  return item.components ?? []
}

/**
 * A bundle has no physical stock of its own — its availability is the most units of it that
 * could be assembled right now, i.e. the smallest (child available / qty per unit) across every
 * component. Recurses so a bundle referencing another bundle resolves correctly; a missing
 * child or an empty components list means the bundle can't be fulfilled at all.
 */
export function getBundleAvailability(item: InventoryItem, itemsById: Map<string, InventoryItem>): number {
  const components = getComponents(item)
  if (components.length === 0) return 0
  let min = Infinity
  for (const c of components) {
    const child = itemsById.get(c.childItemId)
    if (!child || c.quantityPerUnit <= 0) return 0
    const childAvailable = getEffectiveAvailability(child, itemsById)
    min = Math.min(min, Math.floor(childAvailable / c.quantityPerUnit))
  }
  return Math.max(min, 0)
}

/** Bundle-aware availability: bundles derive from components, stocked items (with or without their own components) use their own storage entries as before. */
export function getEffectiveAvailability(item: InventoryItem, itemsById: Map<string, InventoryItem>): number {
  if (getStockType(item) === 'bundle') return getBundleAvailability(item, itemsById)
  return availableForRental(item)
}
