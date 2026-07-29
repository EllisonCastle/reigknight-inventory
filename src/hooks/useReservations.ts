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
import { publishEventSnapshot } from '../lib/publishSnapshot'
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

  const createReservation = async (data: Omit<Reservation, 'id' | 'createdAt'>) => {
    const ref = await addDoc(collection(db, 'reservations'), { ...data, createdAt: serverTimestamp() })
    await publishEventSnapshot(data.eventId)
    return ref
  }

  const deleteReservation = async (id: string) => {
    const reservation = reservations.find((r) => r.id === id)
    await deleteDoc(doc(db, 'reservations', id))
    if (reservation) await publishEventSnapshot(reservation.eventId)
  }

  return { reservations, loading, error, createReservation, deleteReservation }
}
