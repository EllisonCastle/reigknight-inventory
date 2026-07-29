import { useEffect, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { publishEventSnapshot } from '../lib/publishSnapshot'
import type { AgendaItemDoc, VendorDoc } from '../types'

export function useVendors() {
  const [vendors, setVendors] = useState<VendorDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'vendors'), orderBy('name'))
    return onSnapshot(
      q,
      (snap) => {
        setVendors(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VendorDoc))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [])

  const createVendor = (data: Omit<VendorDoc, 'id' | 'createdAt'>) =>
    addDoc(collection(db, 'vendors'), { ...data, createdAt: serverTimestamp() })

  const updateVendor = (id: string, data: Partial<Omit<VendorDoc, 'id' | 'createdAt'>>) =>
    updateDoc(doc(db, 'vendors', id), data)

  /** Agenda items across all events currently assigned to this vendor — used to drive the delete-confirmation flow. */
  const findAssignedAgendaItems = async (vendorId: string): Promise<AgendaItemDoc[]> => {
    const snap = await getDocs(query(collection(db, 'agendaItems'), where('assigneeVendorId', '==', vendorId)))
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AgendaItemDoc)
  }

  /** Reassigns (or clears to 'none') every agenda item pointing at vendorId, republishes affected event snapshots, then deletes the vendor. */
  const deleteVendor = async (vendorId: string, reassignToVendorId: string | null) => {
    const affected = await findAssignedAgendaItems(vendorId)
    if (affected.length > 0) {
      const batch = writeBatch(db)
      affected.forEach((item) => {
        if (reassignToVendorId) {
          batch.update(doc(db, 'agendaItems', item.id), { assigneeVendorId: reassignToVendorId })
        } else {
          batch.update(doc(db, 'agendaItems', item.id), { assigneeType: 'none', assigneeVendorId: null })
        }
      })
      await batch.commit()
      const eventIds = [...new Set(affected.map((item) => item.eventId))]
      await Promise.all(eventIds.map((id) => publishEventSnapshot(id)))
    }
    await deleteDoc(doc(db, 'vendors', vendorId))
  }

  return { vendors, loading, error, createVendor, updateVendor, deleteVendor, findAssignedAgendaItems }
}
