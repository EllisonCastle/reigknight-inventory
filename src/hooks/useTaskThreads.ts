import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import { useCurrentPerson } from './useCurrentPerson'
import type { TaskThreadDoc } from '../types'

function sortThreads(threads: TaskThreadDoc[]): TaskThreadDoc[] {
  return [...threads].sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0))
}

/** All discussion threads for one task, newest activity first. */
export function useTaskThreads(taskId: string | undefined, eventId: string | undefined) {
  const [threads, setThreads] = useState<TaskThreadDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const { person } = useCurrentPerson()

  useEffect(() => {
    if (!taskId) {
      setThreads([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'taskThreads'), where('taskId', '==', taskId))
    return onSnapshot(
      q,
      (snap) => {
        setThreads(sortThreads(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskThreadDoc)))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [taskId])

  const createThread = async (title: string, firstMessageBody: string) => {
    if (!taskId || !eventId) throw new Error('Missing task context.')
    const threadRef = doc(collection(db, 'taskThreads'))
    const messageRef = doc(collection(db, 'taskMessages'))
    const batch = writeBatch(db)
    batch.set(threadRef, {
      taskId,
      eventId,
      title: title.trim(),
      createdBy: user?.uid ?? '',
      createdByName: person?.fullName ?? 'Unknown',
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      messageCount: 1,
      resolved: false,
      resolvedAt: null,
      resolvedBy: null,
    })
    batch.set(messageRef, {
      threadId: threadRef.id,
      taskId,
      authorUid: user?.uid ?? '',
      authorName: person?.fullName ?? 'Unknown',
      authorRole: person?.role === 'admin' ? 'admin' : 'staff',
      body: firstMessageBody.trim(),
      createdAt: serverTimestamp(),
      editedAt: null,
    })
    await batch.commit()
    return threadRef.id
  }

  const resolveThread = (threadId: string) =>
    updateDoc(doc(db, 'taskThreads', threadId), {
      resolved: true,
      resolvedAt: serverTimestamp(),
      resolvedBy: user?.uid ?? '',
    })

  const reopenThread = (threadId: string) =>
    updateDoc(doc(db, 'taskThreads', threadId), { resolved: false, resolvedAt: null, resolvedBy: null })

  return { threads, loading, error, createThread, resolveThread, reopenThread }
}

/**
 * Every taskThread across every event — for unread-badge computation. Only
 * subscribes when `enabled` (the current user is admin/staff); rules deny
 * reads to anyone else, so this avoids a guaranteed permission-denied error
 * for contractors/viewers.
 */
export function useAllTaskThreads(enabled: boolean) {
  const [threads, setThreads] = useState<TaskThreadDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) {
      setThreads([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'taskThreads'))
    return onSnapshot(
      q,
      (snap) => {
        setThreads(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskThreadDoc))
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [enabled])

  return { threads, loading }
}
