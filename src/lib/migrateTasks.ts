import { collection, deleteField, getDocs, writeBatch } from 'firebase/firestore'
import { db } from './firebase'

let hasRun = false

/**
 * One-time backfill for pre-multi-assignee task docs: converts the old single
 * `assigneeId` string field to `assigneeIds: string[]`. Idempotent — skips any
 * doc that already has assigneeIds, so it's safe to call on every page load.
 */
export async function migrateLegacyTaskAssignees(): Promise<number> {
  if (hasRun) return 0
  hasRun = true

  const snap = await getDocs(collection(db, 'tasks'))
  const legacyDocs = snap.docs.filter((d) => !('assigneeIds' in d.data()))
  if (legacyDocs.length === 0) return 0

  const batch = writeBatch(db)
  legacyDocs.forEach((d) => {
    const data = d.data() as Record<string, unknown>
    const legacyAssigneeId = typeof data.assigneeId === 'string' ? data.assigneeId : ''
    batch.update(d.ref, {
      assigneeIds: legacyAssigneeId ? [legacyAssigneeId] : [],
      assigneeId: deleteField(),
    })
  })
  await batch.commit()
  return legacyDocs.length
}
