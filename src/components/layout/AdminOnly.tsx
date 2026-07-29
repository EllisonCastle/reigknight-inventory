import type { ReactNode } from 'react'
import { useCurrentPerson } from '../../hooks/useCurrentPerson'

export function AdminOnly({ children }: { children: ReactNode }) {
  const { person, loading } = useCurrentPerson()

  if (loading) {
    return <p className="text-base text-gray-500">Loading…</p>
  }

  if (person?.role !== 'admin') {
    return <p className="text-base text-gray-500">You need admin access to view this page.</p>
  }

  return <>{children}</>
}
