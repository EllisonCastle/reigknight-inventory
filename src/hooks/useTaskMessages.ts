import { useEffect, useState } from 'react'
import { collection, deleteDoc, doc, increment, onSnapshot, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import { useCurrentPerson } from './useCurrentPerson'
import type { TaskMessageDoc } from '../types'

function sortMessages(messages: TaskMessageDoc[]): TaskMessageDoc[] {
  return [...messages].sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))
}

/** Messages within one thread, chronological. Lazily subscribed — only call for an expanded thread. */
export function useTaskMessages(threadId: string | undefined) {
  const [messages, setMessages] = useState<TaskMessageDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const { person } = useCurrentPerson()

  useEffect(() => {
    if (!threadId) {
      setMessages([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'taskMessages'), where('threadId', '==', threadId))
    return onSnapshot(
      q,
      (snap) => {
        setMessages(sortMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskMessageDoc)))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [threadId])

  const postMessage = async (taskId: string, body: string) => {
    if (!threadId) throw new Error('Missing thread.')
    const messageRef = doc(collection(db, 'taskMessages'))
    const batch = writeBatch(db)
    batch.set(messageRef, {
      threadId,
      taskId,
      authorUid: user?.uid ?? '',
      authorName: person?.fullName ?? 'Unknown',
      authorRole: person?.role === 'admin' ? 'admin' : 'staff',
      body: body.trim(),
      createdAt: serverTimestamp(),
      editedAt: null,
    })
    batch.update(doc(db, 'taskThreads', threadId), {
      lastMessageAt: serverTimestamp(),
      messageCount: increment(1),
    })
    await batch.commit()
  }

  const editMessage = (messageId: string, body: string) =>
    updateDoc(doc(db, 'taskMessages', messageId), { body: body.trim(), editedAt: serverTimestamp() })

  const deleteMessage = (messageId: string) => deleteDoc(doc(db, 'taskMessages', messageId))

  return { messages, loading, error, postMessage, editMessage, deleteMessage }
}
