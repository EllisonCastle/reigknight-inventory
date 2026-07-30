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
import { migratePeopleRoles } from '../lib/migratePeopleRoles'
import { removeUserRole, syncUserRole } from '../lib/syncUserRole'
import type { Person } from '../types'

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    migratePeopleRoles().catch(() => {
      // non-fatal — the list still renders; role-gated rules just won't see this backfill yet
    })
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

  const createPerson = async (data: Omit<Person, 'id' | 'createdAt'>) => {
    const ref = await addDoc(collection(db, 'people'), { ...data, createdAt: serverTimestamp() })
    if (data.authUid) {
      await syncUserRole(data.authUid, data.role, ref.id)
    }
    return ref
  }

  const updatePerson = async (id: string, data: Partial<Omit<Person, 'id' | 'createdAt'>>) => {
    await updateDoc(doc(db, 'people', id), data)
    if ('role' in data || 'authUid' in data) {
      const snap = await getDoc(doc(db, 'people', id))
      if (snap.exists()) {
        const person = snap.data() as Person
        if (person.authUid) {
          await syncUserRole(person.authUid, person.role, id)
        }
      }
    }
  }

  const deletePerson = async (id: string) => {
    const snap = await getDoc(doc(db, 'people', id))
    const authUid = snap.exists() ? (snap.data() as Person).authUid : undefined
    await deleteDoc(doc(db, 'people', id))
    if (authUid) {
      await removeUserRole(authUid)
    }
  }

  return { people, loading, error, createPerson, updatePerson, deletePerson }
}
