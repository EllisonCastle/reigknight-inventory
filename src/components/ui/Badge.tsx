import type { ReactNode } from 'react'

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'regal' | 'red' | 'green' | 'amber' }) {
  const tones: Record<string, string> = {
    neutral: 'bg-surface text-gray-700 border border-gray-200',
    regal: 'bg-regal-light text-regal border border-regal/20',
    red: 'bg-red-50 text-red-700 border border-red-200',
    green: 'bg-green-50 text-green-700 border border-green-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, 'neutral' | 'regal' | 'red' | 'green' | 'amber'> = {
    draft: 'neutral',
    confirmed: 'regal',
    in_progress: 'amber',
    completed: 'green',
    cancelled: 'red',
  }
  return <Badge tone={toneMap[status] ?? 'neutral'}>{status.replace('_', ' ')}</Badge>
}
