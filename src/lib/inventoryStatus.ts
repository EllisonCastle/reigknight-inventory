import type { InventoryItem, StatusBreakdown, StorageEntry } from '../types'

/**
 * Item total is derived from storageEntries, not stored. Items that haven't been through
 * the Phase B storage migration yet fall back to the dormant legacy `totalQuantity` field
 * so the app keeps working during the window between shipping Checkpoint 1 and running
 * the migration — this fallback stops mattering once storageEntries is populated.
 */
export function getItemTotalQuantity(item: Pick<InventoryItem, 'storageEntries' | 'totalQuantity'>): number {
  if (item.storageEntries?.length) {
    return item.storageEntries.reduce((sum, e) => sum + e.quantity, 0)
  }
  return item.totalQuantity ?? 0
}

export function availableForRental(item: Pick<InventoryItem, 'storageEntries' | 'totalQuantity' | 'statusBreakdown'>): number {
  return getItemTotalQuantity(item) - item.statusBreakdown.needsRepair - item.statusBreakdown.needsReplacement
}

export function needsAttention(item: Pick<InventoryItem, 'statusBreakdown'>): boolean {
  return item.statusBreakdown.needsRepair + item.statusBreakdown.needsReplacement > 0
}

export interface AttentionInfo {
  tone: 'amber' | 'red' | null
  label: string | null
}

export function attentionInfo(item: Pick<InventoryItem, 'statusBreakdown'>): AttentionInfo {
  const { needsRepair, needsReplacement } = item.statusBreakdown
  if (needsReplacement > 0 && needsRepair > 0) {
    return { tone: 'red', label: `${needsReplacement} replace • ${needsRepair} repair` }
  }
  if (needsReplacement > 0) {
    return { tone: 'red', label: `${needsReplacement} need${needsReplacement === 1 ? 's' : ''} replacement` }
  }
  if (needsRepair > 0) {
    return { tone: 'amber', label: `${needsRepair} need${needsRepair === 1 ? 's' : ''} repair` }
  }
  return { tone: null, label: null }
}

/**
 * totalQuantity increases add the delta to good; decreases remove from
 * needsReplacement first, then needsRepair, then good, per the spec's invariants.
 */
export function rebalanceForNewTotal(prev: StatusBreakdown, prevTotal: number, newTotal: number): StatusBreakdown {
  const delta = newTotal - prevTotal
  if (delta === 0) return prev
  if (delta > 0) {
    return { ...prev, good: prev.good + delta }
  }
  let toRemove = -delta
  let { good, needsRepair, needsReplacement } = prev
  const fromReplacement = Math.min(needsReplacement, toRemove)
  needsReplacement -= fromReplacement
  toRemove -= fromReplacement
  const fromRepair = Math.min(needsRepair, toRemove)
  needsRepair -= fromRepair
  toRemove -= fromRepair
  const fromGood = Math.min(good, toRemove)
  good -= fromGood
  return { good, needsRepair, needsReplacement }
}

export interface StatusValidation {
  good: number
  valid: boolean
  error?: string
}

/** Good is derived (total - repair - replacement) and read-only in the UI. */
export function validateStatusCounts(totalQuantity: number, needsRepair: number, needsReplacement: number): StatusValidation {
  const good = totalQuantity - needsRepair - needsReplacement
  if (good < 0) {
    return { good, valid: false, error: `Needs Repair + Needs Replacement (${needsRepair + needsReplacement}) can't exceed Total Quantity Owned (${totalQuantity}).` }
  }
  return { good, valid: true }
}

/** Removes `amount` units from the tail of the entries list first — used when status changes shrink the total (e.g. "removed, not replaced"). */
export function reduceStorageEntriesBy(entries: StorageEntry[], amount: number): StorageEntry[] {
  let remaining = amount
  const next = [...entries]
  for (let i = next.length - 1; i >= 0 && remaining > 0; i--) {
    const take = Math.min(next[i].quantity, remaining)
    next[i] = { ...next[i], quantity: next[i].quantity - take }
    remaining -= take
  }
  return next
}

export function markRepaired(status: StatusBreakdown): StatusBreakdown {
  return { good: status.good + status.needsRepair, needsRepair: 0, needsReplacement: status.needsReplacement }
}

export interface MarkReplacedResult {
  statusBreakdown: StatusBreakdown
  totalQuantityDelta: number
}

/** addBackToGood=true means replaced 1:1 with new units (total stays the same); false means removed from inventory entirely (total shrinks). */
export function markReplaced(status: StatusBreakdown, addBackToGood: boolean): MarkReplacedResult {
  const n = status.needsReplacement
  if (addBackToGood) {
    return {
      statusBreakdown: { good: status.good + n, needsRepair: status.needsRepair, needsReplacement: 0 },
      totalQuantityDelta: 0,
    }
  }
  return {
    statusBreakdown: { good: status.good, needsRepair: status.needsRepair, needsReplacement: 0 },
    totalQuantityDelta: -n,
  }
}
