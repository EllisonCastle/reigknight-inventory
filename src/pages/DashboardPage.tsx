import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useVenues } from '../hooks/useVenues'
import { useInventoryItems } from '../hooks/useInventoryItems'
import { useEvents } from '../hooks/useEvents'
import { StatusBadge } from '../components/ui/Badge'
import { formatTimestamp } from '../lib/datetime'

function StatTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-charcoal">{value}</p>
    </div>
  )
}

export function DashboardPage() {
  const { venues } = useVenues()
  const { items } = useInventoryItems()
  const { events } = useEvents()

  const upcoming = useMemo(() => {
    const now = Date.now()
    return events
      .filter((e) => e.status !== 'cancelled' && e.status !== 'completed' && e.endAt.toMillis() >= now)
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis())
      .slice(0, 5)
  }, [events])

  const venueName = useMemo(() => {
    const map = new Map(venues.map((v) => [v.id, v.name]))
    return (id: string) => map.get(id) ?? '—'
  }, [venues])

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-xl font-semibold text-charcoal">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Venues" value={venues.length} />
        <StatTile label="Inventory items" value={items.length} />
        <StatTile label="Upcoming events" value={upcoming.length} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-charcoal">Next up</h2>
      {upcoming.length === 0 ? (
        <p className="text-base text-gray-500">Nothing on the calendar right now.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-base">
            <thead className="bg-surface text-left text-sm font-medium uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Venue</th>
                <th className="px-4 py-2.5">Start</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {upcoming.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-medium text-charcoal">
                    <Link to={`/events/${event.id}`} className="hover:underline">
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{venueName(event.venueId)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatTimestamp(event.startAt)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
