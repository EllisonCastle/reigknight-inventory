import { deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { PersonRole } from '../constants/people'

/**
 * Keeps users/{authUid} (the mirror Firestore rules check for role-based access)
 * in sync with a person's role. Write access to users/ is admin-only once
 * Phase 3.6 rules are live — that's deliberate defense-in-depth so editing your
 * own people.role via the still-open people collection can't self-elevate you.
 * A non-admin syncing someone else's role will therefore see this fail; that's
 * expected, so failures are swallowed rather than surfaced on the primary
 * people/ write.
 */
export async function syncUserRole(authUid: string, role: PersonRole, personId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', authUid), { role, personId })
  } catch {
    // non-fatal — see doc comment above
  }
}

export async function removeUserRole(authUid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', authUid))
  } catch {
    // non-fatal
  }
}
