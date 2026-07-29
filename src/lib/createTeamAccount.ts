import { deleteApp, initializeApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth, signOut, updateProfile } from 'firebase/auth'
import { firebaseConfig } from './firebase'

/**
 * Creates a new Firebase Auth (email/password) account without disturbing the
 * admin's own signed-in session. createUserWithEmailAndPassword normally signs
 * in as the new user on whichever auth instance calls it, so this runs it on a
 * throwaway secondary Firebase App instance instead, then tears that instance
 * down — the admin's real session (on the default app) is never touched.
 */
export async function createTeamAccount(email: string, password: string, displayName: string): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`)
  const secondaryAuth = getAuth(secondaryApp)
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password)
    if (displayName) {
      await updateProfile(credential.user, { displayName })
    }
    return credential.user.uid
  } finally {
    await signOut(secondaryAuth).catch(() => {})
    await deleteApp(secondaryApp).catch(() => {})
  }
}
