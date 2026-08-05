import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import { syncReservationsEventStatus, syncReservationsEventWindow } from '../lib/availability'
import { publishEventSnapshot } from '../lib/publishSnapshot'
import type { EventDoc } from '../types'

export function useEvents() {
  const [events, setEvents] = useState<EventDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('startAt'))
    return onSnapshot(
      q,
      (snap) => {
        setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EventDoc))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [])

  const createEvent = async (data: Omit<EventDoc, 'id' | 'createdAt' | 'createdBy' | 'shareToken'>) => {
    const ref = await addDoc(collection(db, 'events'), {
      ...data,
      shareToken: crypto.randomUUID(),
      createdAt: serverTimestamp(),
      createdBy: user?.uid ?? '',
    })
    await publishEventSnapshot(ref.id)
    return ref
  }

  const updateEvent = async (
    id: string,
    data: Partial<Omit<EventDoc, 'id' | 'createdAt' | 'createdBy' | 'shareToken'>>,
  ) => {
    let oldEvent: EventDoc | undefined
    if (data.startAt || data.endAt) {
      const snap = await getDoc(doc(db, 'events', id))
      if (snap.exists()) oldEvent = { id: snap.id, ...snap.data() } as EventDoc
    }

    await updateDoc(doc(db, 'events', id), data)

    if (data.status) {
      await syncReservationsEventStatus(id, data.status)
    }
    if (oldEvent) {
      const newStartAt = data.startAt ?? oldEvent.startAt
      const newEndAt = data.endAt ?? oldEvent.endAt
      if (newStartAt.toMillis() !== oldEvent.startAt.toMillis() || newEndAt.toMillis() !== oldEvent.endAt.toMillis()) {
        await syncReservationsEventWindow(id, oldEvent.startAt, oldEvent.endAt, newStartAt, newEndAt)
      }
    }
    await publishEventSnapshot(id)
  }

  const deleteEvent = async (id: string) => {
    const snap = await getDoc(doc(db, 'events', id))
    const shareToken = snap.exists() ? (snap.data() as EventDoc).shareToken : undefined
    await deleteDoc(doc(db, 'events', id))
    if (shareToken) {
      await deleteDoc(doc(db, 'publicViews', shareToken))
    }
  }

  return { events, loading, error, createEvent, updateEvent, deleteEvent }
}
