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
