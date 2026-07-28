import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { Reservation } from '../types'

export function useReservationsForEvent(eventId: string | undefined) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!eventId) {
      setReservations([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'reservations'), where('eventId', '==', eventId))
    return onSnapshot(
      q,
      (snap) => {
        setReservations(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Reservation))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [eventId])

  const createReservation = (data: Omit<Reservation, 'id' | 'createdAt'>) =>
    addDoc(collection(db, 'reservations'), { ...data, createdAt: serverTimestamp() })

  const deleteReservation = (id: string) => deleteDoc(doc(db, 'reservations', id))

  return { reservations, loading, error, createReservation, deleteReservation }
}
