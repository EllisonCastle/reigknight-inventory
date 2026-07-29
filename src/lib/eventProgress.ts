import type { PublicViewSnapshot } from '../types'
import type { TaskType } from '../constants/tasks'

type SnapshotTask = PublicViewSnapshot['tasks'][number]

export interface TaskProgress {
  total: number
  done: number
  percentDone: number
}

export function computeTaskProgress(tasks: SnapshotTask[]): TaskProgress {
  const total = tasks.length
  const done = tasks.filter((t) => t.status === 'done').length
  return { total, done, percentDone: total === 0 ? 0 : Math.round((done / total) * 100) }
}

export function outstandingTasks(tasks: SnapshotTask[]): SnapshotTask[] {
  return tasks.filter((t) => t.status !== 'done')
}

/** Blocked tasks first, then soonest due date — same convention as the dashboard's admin task list. */
export function sortByBlockedThenDueDate(tasks: SnapshotTask[]): SnapshotTask[] {
  return [...tasks].sort((a, b) => {
    const aBlocked = a.status === 'blocked' ? 0 : 1
    const bBlocked = b.status === 'blocked' ? 0 : 1
    if (aBlocked !== bBlocked) return aBlocked - bBlocked
    return (a.dueDate?.toMillis() ?? 0) - (b.dueDate?.toMillis() ?? 0)
  })
}

export interface TaskGroup<K> {
  key: K
  tasks: SnapshotTask[]
}

export function groupOutstandingByPerson(tasks: SnapshotTask[]): TaskGroup<string>[] {
  const map = new Map<string, SnapshotTask[]>()
  for (const task of tasks) {
    const names = task.assigneeNames.length > 0 ? task.assigneeNames : ['Unassigned']
    for (const name of names) {
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(task)
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === 'Unassigned') return 1
      if (b === 'Unassigned') return -1
      return a.localeCompare(b)
    })
    .map(([key, tasks]) => ({ key, tasks }))
}

export function groupOutstandingByType(tasks: SnapshotTask[]): TaskGroup<TaskType>[] {
  const map = new Map<TaskType, SnapshotTask[]>()
  for (const task of tasks) {
    if (!map.has(task.taskType)) map.set(task.taskType, [])
    map.get(task.taskType)!.push(task)
  }
  return [...map.entries()].map(([key, tasks]) => ({ key, tasks }))
}
