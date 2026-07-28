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
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import { syncReservationsEventStatus } from '../lib/availability'
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

  const createEvent = (data: Omit<EventDoc, 'id' | 'createdAt' | 'createdBy' | 'shareToken'>) =>
    addDoc(collection(db, 'events'), {
      ...data,
      shareToken: crypto.randomUUID(),
      createdAt: serverTimestamp(),
      createdBy: user?.uid ?? '',
    })

  const updateEvent = async (
    id: string,
    data: Partial<Omit<EventDoc, 'id' | 'createdAt' | 'createdBy' | 'shareToken'>>,
  ) => {
    await updateDoc(doc(db, 'events', id), data)
    if (data.status) {
      await syncReservationsEventStatus(id, data.status)
    }
  }

  const deleteEvent = (id: string) => deleteDoc(doc(db, 'events', id))

  return { events, loading, error, createEvent, updateEvent, deleteEvent }
}
