import { useEffect, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { usePeople } from './usePeople'
import { syncUserRole } from '../lib/syncUserRole'
import type { Person } from '../types'

/**
 * Resolves the signed-in user to their people/{personId} record, matching by
 * authUid first, then by email (claiming an existing admin-added record), and
 * finally auto-provisioning a new "staff" record if neither matches. Waits for
 * the live people snapshot to reflect the write rather than constructing an
 * optimistic Person, so callers always see real Firestore data (e.g. role).
 *
 * Every time a match is found, the users/{authUid} mirror doc that Firestore
 * rules read (myPersonId()) is re-synced to it. That mirror is otherwise only
 * written from createPerson/updatePerson/the one-time role migration, so it
 * can silently drift from what the client resolves here — e.g. duplicate
 * people records for the same email. A drifted mirror makes the rules'
 * `myPersonId() in assigneeIds` check fail even though the UI thinks the user
 * is an assignee, which shows up as a task checkbox that ticks and then
 * reverts (the write gets rejected, Firestore's optimistic cache rolls back).
 * Re-syncing on every resolve keeps the two in agreement by construction.
 */
export function useCurrentPerson() {
  const { user } = useAuth()
  const { people, loading: peopleLoading, createPerson, updatePerson } = usePeople()
  const [person, setPerson] = useState<Person | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const hasRunRef = useRef(false)

  useEffect(() => {
    if (peopleLoading || !user) return

    const byAuthUid = people.find((p) => p.authUid === user.uid)
    if (byAuthUid) {
      setPerson(byAuthUid)
      setLoading(false)
      syncUserRole(user.uid, byAuthUid.role, byAuthUid.id)
      return
    }

    if (hasRunRef.current) return
    hasRunRef.current = true

    const byEmail = people.find(
      (p) => !p.authUid && p.email && user.email && p.email.toLowerCase() === user.email.toLowerCase(),
    )

    ;(async () => {
      try {
        if (byEmail) {
          await updatePerson(byEmail.id, { authUid: user.uid })
        } else {
          await createPerson({
            fullName: user.email ?? 'Team member',
            email: user.email ?? '',
            phone: '',
            role: 'staff',
            authUid: user.uid,
            active: true,
          })
        }
        // Loading stays true until the live `people` snapshot includes the
        // new/updated record, which re-runs this effect into the branch above.
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not set up your tasks profile.')
        setLoading(false)
      }
    })()
  }, [peopleLoading, people, user, createPerson, updatePerson])

  return { person, loading: loading || peopleLoading, error }
}
