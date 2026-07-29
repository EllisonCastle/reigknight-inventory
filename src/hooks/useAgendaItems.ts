import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'
import { publishEventSnapshot } from '../lib/publishSnapshot'
import type { AgendaItemDoc } from '../types'

function sortAgendaItems(items: AgendaItemDoc[]): AgendaItemDoc[] {
  return [...items].sort((a, b) => {
    const diff = a.startAt.toMillis() - b.startAt.toMillis()
    if (diff !== 0) return diff
    return a.sortOrder - b.sortOrder
  })
}

export function useAgendaItemsForEvent(eventId: string | undefined) {
  const [agendaItems, setAgendaItems] = useState<AgendaItemDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  useEffect(() => {
    if (!eventId) {
      setAgendaItems([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'agendaItems'), where('eventId', '==', eventId))
    return onSnapshot(
      q,
      (snap) => {
        setAgendaItems(sortAgendaItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AgendaItemDoc)))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [eventId])

  const createAgendaItem = async (data: Omit<AgendaItemDoc, 'id' | 'createdAt' | 'createdBy' | 'sortOrder'>) => {
    const ref = await addDoc(collection(db, 'agendaItems'), {
      ...data,
      sortOrder: Date.now(),
      createdAt: serverTimestamp(),
      createdBy: user?.uid ?? '',
    })
    if (eventId) await publishEventSnapshot(eventId)
    return ref
  }

  const updateAgendaItem = async (id: string, data: Partial<Omit<AgendaItemDoc, 'id' | 'createdAt' | 'createdBy'>>) => {
    await updateDoc(doc(db, 'agendaItems', id), data)
    if (eventId) await publishEventSnapshot(eventId)
  }

  const deleteAgendaItem = async (id: string) => {
    await deleteDoc(doc(db, 'agendaItems', id))
    if (eventId) await publishEventSnapshot(eventId)
  }

  /** Swaps sortOrder with the neighboring item that shares the same startAt — reorder is scoped to same-time siblings, per spec. */
  const reorder = async (id: string, direction: 'up' | 'down') => {
    const item = agendaItems.find((i) => i.id === id)
    if (!item) return
    const siblings = agendaItems.filter((i) => i.startAt.toMillis() === item.startAt.toMillis())
    const index = siblings.findIndex((i) => i.id === id)
    const neighbor = siblings[direction === 'up' ? index - 1 : index + 1]
    if (!neighbor) return

    const batch = writeBatch(db)
    batch.update(doc(db, 'agendaItems', item.id), { sortOrder: neighbor.sortOrder })
    batch.update(doc(db, 'agendaItems', neighbor.id), { sortOrder: item.sortOrder })
    await batch.commit()
    if (eventId) await publishEventSnapshot(eventId)
  }

  const moveUp = (id: string) => reorder(id, 'up')
  const moveDown = (id: string) => reorder(id, 'down')

  return { agendaItems, loading, error, createAgendaItem, updateAgendaItem, deleteAgendaItem, moveUp, moveDown }
}
