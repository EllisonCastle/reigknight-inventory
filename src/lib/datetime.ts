import { Timestamp } from 'firebase/firestore'

/** Formats a Timestamp for an <input type="datetime-local"> value, in local time. */
export function timestampToLocalInput(ts?: Timestamp | null): string {
  if (!ts) return ''
  const d = ts.toDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localInputToTimestamp(value: string): Timestamp {
  return Timestamp.fromDate(new Date(value))
}

export function formatTimestamp(ts?: Timestamp | null): string {
  if (!ts) return '—'
  return ts.toDate().toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** Formats a Timestamp for an <input type="date"> value, in local time. */
export function timestampToDateInput(ts?: Timestamp | null): string {
  if (!ts) return ''
  const d = ts.toDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** value is a YYYY-MM-DD string from <input type="date"> — build local midnight to avoid a timezone shift. */
export function dateInputToTimestamp(value: string): Timestamp {
  const [y, m, d] = value.split('-').map(Number)
  return Timestamp.fromDate(new Date(y, m - 1, d))
}

export function formatDate(ts?: Timestamp | null): string {
  if (!ts) return '—'
  return ts.toDate().toLocaleDateString(undefined, { dateStyle: 'medium' })
}
