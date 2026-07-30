import { useCurrentPerson } from './useCurrentPerson'

/**
 * Client-side mirror of the Phase 3.6 Firestore rules, purely for hiding/
 * disabling controls the user isn't allowed to use — the rules themselves are
 * the real enforcement. Keep the two in sync if the rules ever change.
 */
export function usePermissions() {
  const { person, loading } = useCurrentPerson()
  const role = person?.role
  const isAdmin = role === 'admin'
  const isAdminOrStaff = role === 'admin' || role === 'staff'

  const canEditTaskStatus = (assigneeIds: string[]) =>
    isAdmin || (Boolean(person?.id) && assigneeIds.includes(person!.id))

  return { loading, role, isAdmin, isAdminOrStaff, canEditTaskStatus, personId: person?.id }
}
