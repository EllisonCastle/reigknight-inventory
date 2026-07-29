import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type WhereFilterOp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import { migrateLegacyTaskAssignees } from '../lib/migrateTasks'
import { publishEventSnapshot } from '../lib/publishSnapshot'
import type { TaskDoc } from '../types'
import type { TaskStatus } from '../constants/tasks'

function useTasksQuery(field: string, op: WhereFilterOp, value: string | undefined) {
  const [tasks, setTasks] = useState<TaskDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    migrateLegacyTaskAssignees().catch(() => {
      // non-fatal — the list still renders with whatever fields exist
    })
    if (!value) {
      setTasks([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'tasks'), where(field, op, value), orderBy('dueDate'))
    return onSnapshot(
      q,
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskDoc))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field, op, value])

  return { tasks, loading, error }
}

export function useTasksForEvent(eventId: string | undefined) {
  const { user } = useAuth()
  const { tasks, loading, error } = useTasksQuery('eventId', '==', eventId)

  const createTask = async (data: Omit<TaskDoc, 'id' | 'createdAt' | 'createdBy' | 'completedAt'>) => {
    const ref = await addDoc(collection(db, 'tasks'), {
      ...data,
      completedAt: null,
      createdAt: serverTimestamp(),
      createdBy: user?.uid ?? '',
    })
    if (eventId) await publishEventSnapshot(eventId)
    return ref
  }

  const updateTask = async (id: string, data: Partial<Omit<TaskDoc, 'id' | 'createdAt' | 'createdBy'>>) => {
    await updateDoc(doc(db, 'tasks', id), data)
    if (eventId) await publishEventSnapshot(eventId)
  }

  const setTaskStatus = async (id: string, status: TaskStatus) => {
    await updateDoc(doc(db, 'tasks', id), {
      status,
      completedAt: status === 'done' ? serverTimestamp() : null,
    })
    if (eventId) await publishEventSnapshot(eventId)
  }

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id))
    if (eventId) await publishEventSnapshot(eventId)
  }

  return { tasks, loading, error, createTask, updateTask, setTaskStatus, deleteTask }
}

export function useTasksForAssignee(personId: string | undefined) {
  const { tasks, loading, error } = useTasksQuery('assigneeIds', 'array-contains', personId)

  const setTaskStatus = async (id: string, status: TaskStatus) => {
    await updateDoc(doc(db, 'tasks', id), {
      status,
      completedAt: status === 'done' ? serverTimestamp() : null,
    })
    const eventId = tasks.find((t) => t.id === id)?.eventId
    if (eventId) await publishEventSnapshot(eventId)
  }

  return { tasks, loading, error, setTaskStatus }
}

/** Every task across every event, ordered by due date — for the admin dashboard widget. */
export function useAllTasks() {
  const [tasks, setTasks] = useState<TaskDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    migrateLegacyTaskAssignees().catch(() => {
      // non-fatal — the list still renders with whatever fields exist
    })
    const q = query(collection(db, 'tasks'), orderBy('dueDate'))
    return onSnapshot(
      q,
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskDoc))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [])

  return { tasks, loading, error }
}
