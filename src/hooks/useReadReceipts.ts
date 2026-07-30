import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import type { TaskReadReceiptDoc } from '../types'

/** All of the current user's task read receipts, for unread-badge computation. */
export function useMyReadReceipts() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState<TaskReadReceiptDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setReceipts([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'taskReadReceipts'), where('userUid', '==', user.uid))
    return onSnapshot(
      q,
      (snap) => {
        setReceipts(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TaskReadReceiptDoc))
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [user])

  return { receipts, loading }
}

/** Marks a task's discussion as read "now" for the given user — call when the Discussion section opens. */
export async function markTaskRead(taskId: string, userUid: string) {
  await setDoc(doc(db, 'taskReadReceipts', `${taskId}_${userUid}`), {
    taskId,
    userUid,
    lastReadAt: serverTimestamp(),
  })
}
