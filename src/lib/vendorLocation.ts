import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { THROUGH_VENDOR_LOCATION_ID, type LocationDoc } from '../types'

/**
 * Singleton "Through Vendor" location at a fixed doc id, so two admins creating a
 * vendor-sourced item at the same time can never race into duplicate records. Vendor
 * items store their quantity as one storageEntry pointed here (see InventoryForm's
 * vendor-mode quantity input), keeping the derived-total math working without exposing
 * the full location/sub-location/bin editor for items that aren't physically stored here.
 */
export async function getOrCreateVendorLocation(): Promise<LocationDoc> {
  const ref = doc(db, 'locations', THROUGH_VENDOR_LOCATION_ID)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as LocationDoc
  }
  await setDoc(
    ref,
    {
      name: 'Through Vendor',
      type: 'vendor',
      subLocations: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  return { id: THROUGH_VENDOR_LOCATION_ID, name: 'Through Vendor', type: 'vendor', subLocations: [], createdAt: null, updatedAt: null }
}
