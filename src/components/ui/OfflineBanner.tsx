import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div className="sticky top-0 z-40 bg-amber-100 px-4 py-2 text-center text-base font-medium text-amber-900">
      You're offline — changes will fail
    </div>
  )
}
