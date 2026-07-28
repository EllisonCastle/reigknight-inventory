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
import type { Venue } from '../types'

export function useVenues() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'venues'), orderBy('name'))
    return onSnapshot(
      q,
      (snap) => {
        setVenues(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Venue))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [])

  const createVenue = (data: Omit<Venue, 'id' | 'createdAt'>) =>
    addDoc(collection(db, 'venues'), { ...data, createdAt: serverTimestamp() })

  const updateVenue = (id: string, data: Partial<Omit<Venue, 'id' | 'createdAt'>>) =>
    updateDoc(doc(db, 'venues', id), data)

  const deleteVenue = (id: string) => deleteDoc(doc(db, 'venues', id))

  return { venues, loading, error, createVenue, updateVenue, deleteVenue }
}
