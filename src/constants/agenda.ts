export const ASSIGNEE_TYPES = ['none', 'person', 'vendor'] as const

export const ASSIGNEE_TYPE_LABELS: Record<(typeof ASSIGNEE_TYPES)[number], string> = {
  none: 'None',
  person: 'Person',
  vendor: 'Vendor',
}

export type AssigneeType = (typeof ASSIGNEE_TYPES)[number]
