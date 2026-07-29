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
import type { Person } from '../types'

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'people'), orderBy('fullName'))
    return onSnapshot(
      q,
      (snap) => {
        setPeople(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Person))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [])

  const createPerson = (data: Omit<Person, 'id' | 'createdAt'>) =>
    addDoc(collection(db, 'people'), { ...data, createdAt: serverTimestamp() })

  const updatePerson = (id: string, data: Partial<Omit<Person, 'id' | 'createdAt'>>) =>
    updateDoc(doc(db, 'people', id), data)

  const deletePerson = (id: string) => deleteDoc(doc(db, 'people', id))

  return { people, loading, error, createPerson, updatePerson, deletePerson }
}
