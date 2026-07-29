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
import { migrateLegacyInventoryItems } from '../lib/migrateInventory'
import type { InventoryItem } from '../types'

export function useInventoryItems() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    migrateLegacyInventoryItems().catch(() => {
      // non-fatal — the list still renders with whatever fields exist
    })
    const q = query(collection(db, 'inventoryItems'), orderBy('name'))
    return onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InventoryItem))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      },
    )
  }, [])

  const createItem = (data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>) =>
    addDoc(collection(db, 'inventoryItems'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })

  const updateItem = (id: string, data: Partial<Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>>) =>
    updateDoc(doc(db, 'inventoryItems', id), { ...data, updatedAt: serverTimestamp() })

  const deleteItem = (id: string) => deleteDoc(doc(db, 'inventoryItems', id))

  return { items, loading, error, createItem, updateItem, deleteItem }
}
