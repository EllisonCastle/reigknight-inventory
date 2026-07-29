import { collection, deleteField, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

let hasRun = false

/**
 * One-time backfill for pre-1.5 inventoryItems docs: adds statusBreakdown/condition/
 * the new optional fields, and drops the retired sku field. Idempotent — skips any
 * doc that already has statusBreakdown, so it's safe to call on every page load.
 */
export async function migrateLegacyInventoryItems(): Promise<number> {
  if (hasRun) return 0
  hasRun = true

  const snap = await getDocs(collection(db, 'inventoryItems'))
  const legacyDocs = snap.docs.filter((d) => !('statusBreakdown' in d.data()))
  if (legacyDocs.length === 0) return 0

  const batch = writeBatch(db)
  legacyDocs.forEach((d) => {
    const data = d.data() as Record<string, unknown>
    const totalQuantity = typeof data.totalQuantity === 'number' ? data.totalQuantity : 0
    batch.update(d.ref, {
      statusBreakdown: { good: totalQuantity, needsRepair: 0, needsReplacement: 0 },
      condition: 'Good',
      category: data.category ?? '',
      material: data.material ?? '',
      color: data.color ?? '',
      colorCustom: data.colorCustom ?? '',
      bin: data.bin ?? '',
      updatedAt: serverTimestamp(),
      sku: deleteField(),
    })
  })
  await batch.commit()
  return legacyDocs.length
}
