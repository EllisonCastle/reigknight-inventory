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
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import type { TaskDoc } from '../types'
import type { TaskStatus } from '../constants/tasks'

function useTasksQuery(field: 'eventId' | 'assigneeId', value: string | undefined) {
  const [tasks, setTasks] = useState<TaskDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!value) {
      setTasks([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'tasks'), where(field, '==', value), orderBy('dueDate'))
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
  }, [field, value])

  return { tasks, loading, error }
}

export function useTasksForEvent(eventId: string | undefined) {
  const { user } = useAuth()
  const { tasks, loading, error } = useTasksQuery('eventId', eventId)

  const createTask = (data: Omit<TaskDoc, 'id' | 'createdAt' | 'createdBy' | 'completedAt'>) =>
    addDoc(collection(db, 'tasks'), {
      ...data,
      completedAt: null,
      createdAt: serverTimestamp(),
      createdBy: user?.uid ?? '',
    })

  const updateTask = (id: string, data: Partial<Omit<TaskDoc, 'id' | 'createdAt' | 'createdBy'>>) =>
    updateDoc(doc(db, 'tasks', id), data)

  const setTaskStatus = (id: string, status: TaskStatus) =>
    updateDoc(doc(db, 'tasks', id), {
      status,
      completedAt: status === 'done' ? serverTimestamp() : null,
    })

  const deleteTask = (id: string) => deleteDoc(doc(db, 'tasks', id))

  return { tasks, loading, error, createTask, updateTask, setTaskStatus, deleteTask }
}

export function useTasksForAssignee(personId: string | undefined) {
  const { tasks, loading, error } = useTasksQuery('assigneeId', personId)

  const setTaskStatus = (id: string, status: TaskStatus) =>
    updateDoc(doc(db, 'tasks', id), {
      status,
      completedAt: status === 'done' ? serverTimestamp() : null,
    })

  return { tasks, loading, error, setTaskStatus }
}
