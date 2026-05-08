'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const createUserDocument = async (firebaseUser: User) => {
    const userRef = doc(db, 'users', firebaseUser.uid)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous',
        avatarUrl: firebaseUser.photoURL || '',
        createdAt: new Date().toISOString(),
      })
    }
  }

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    await createUserDocument(result.user)
  }

  const signInWithEmail = async (email: string, password: string) => {
    const result = await signInWithEmailAndPassword(auth, email, password)
    await createUserDocument(result.user)
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    await createUserDocument(result.user)
  }

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}