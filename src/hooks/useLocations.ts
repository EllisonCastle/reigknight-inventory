import { useEffect, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { InventoryItem, LocationDoc, SubLocation } from '../types'

export function useLocations() {
  const [locations, setLocations] = useState<LocationDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('name'))
    return onSnapshot(
      q,
      (snap) => {
        setLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LocationDoc))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [])

  const createLocation = (data: { name: string; type: LocationDoc['type'] }) =>
    addDoc(collection(db, 'locations'), {
      ...data,
      subLocations: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

  const updateLocation = (id: string, data: Partial<Pick<LocationDoc, 'name' | 'type'>>) =>
    updateDoc(doc(db, 'locations', id), { ...data, updatedAt: serverTimestamp() })

  const deleteLocation = (id: string) => deleteDoc(doc(db, 'locations', id))

  // Sub-locations are embedded, so add/rename/remove are whole-array rewrites —
  // Firestore has no partial-array-element-by-id update.
  const addSubLocation = (location: LocationDoc, name: string) => {
    const next: SubLocation[] = [...location.subLocations, { id: crypto.randomUUID(), name: name.trim() }]
    return updateDoc(doc(db, 'locations', location.id), { subLocations: next, updatedAt: serverTimestamp() })
  }

  const renameSubLocation = (location: LocationDoc, subLocationId: string, name: string) => {
    const next = location.subLocations.map((s) => (s.id === subLocationId ? { ...s, name: name.trim() } : s))
    return updateDoc(doc(db, 'locations', location.id), { subLocations: next, updatedAt: serverTimestamp() })
  }

  const removeSubLocation = (location: LocationDoc, subLocationId: string) => {
    const next = location.subLocations.filter((s) => s.id !== subLocationId)
    return updateDoc(doc(db, 'locations', location.id), { subLocations: next, updatedAt: serverTimestamp() })
  }

  /** Items whose storageEntries reference this location (optionally scoped to one sub-location) — drives delete protection. */
  const countItemsAtLocation = (items: InventoryItem[], locationId: string, subLocationId?: string): number =>
    items.filter((i) =>
      (i.storageEntries ?? []).some(
        (e) => e.locationId === locationId && (subLocationId === undefined || e.subLocationId === subLocationId),
      ),
    ).length

  return {
    locations,
    loading,
    error,
    createLocation,
    updateLocation,
    deleteLocation,
    addSubLocation,
    renameSubLocation,
    removeSubLocation,
    countItemsAtLocation,
  }
}
