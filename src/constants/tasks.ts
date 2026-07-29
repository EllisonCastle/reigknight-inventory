export const TASK_TYPES = [
  'purchase',
  'install',
  'paint',
  'build',
  'rent',
  'clean',
  'setup',
  'teardown',
  'other',
] as const

export const TASK_TYPE_LABELS: Record<(typeof TASK_TYPES)[number], string> = {
  purchase: 'Purchase',
  install: 'Install',
  paint: 'Paint',
  build: 'Build',
  rent: 'Rent',
  clean: 'Clean',
  setup: 'Setup',
  teardown: 'Teardown',
  other: 'Other',
}

export const TASK_STATUSES = ['todo', 'in_progress', 'done', 'blocked'] as const

export const TASK_STATUS_LABELS: Record<(typeof TASK_STATUSES)[number], string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
}

export type TaskType = (typeof TASK_TYPES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
