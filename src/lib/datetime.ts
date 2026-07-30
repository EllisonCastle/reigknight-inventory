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

const RELATIVE_DIVISIONS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 60 * 60 * 24 * 365],
  ['month', 60 * 60 * 24 * 30],
  ['week', 60 * 60 * 24 * 7],
  ['day', 60 * 60 * 24],
  ['hour', 60 * 60],
  ['minute', 60],
]

/** "3 days ago" style formatting, falling back to "just now" inside a minute. */
export function formatRelativeTime(ts?: Timestamp | null): string {
  if (!ts) return '—'
  const diffSeconds = Math.round((ts.toDate().getTime() - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, secondsInUnit] of RELATIVE_DIVISIONS) {
    if (Math.abs(diffSeconds) >= secondsInUnit) {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit)
    }
  }
  return rtf.format(diffSeconds, 'second')
}
