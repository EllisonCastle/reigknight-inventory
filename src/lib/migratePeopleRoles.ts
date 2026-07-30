import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import { syncUserRole } from './syncUserRole'
import type { Person } from '../types'

let hasRun = false

/**
 * One-time backfill: creates users/{authUid} mirror docs for every existing
 * person who already has an authUid, so role-based Firestore rules have
 * something to look up immediately once deployed. Idempotent (setDoc
 * overwrites cleanly) and safe to call on every load.
 */
export async function migratePeopleRoles(): Promise<number> {
  if (hasRun) return 0
  hasRun = true

  const snap = await getDocs(collection(db, 'people'))
  const withAuth = snap.docs.filter((d) => Boolean((d.data() as Person).authUid))
  await Promise.all(
    withAuth.map((d) => {
      const data = d.data() as Person
      return syncUserRole(data.authUid, data.role, d.id)
    }),
  )
  return withAuth.length
}
