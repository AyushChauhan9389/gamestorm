'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Handle auth state changes with proper redirects
      if (event === 'SIGNED_IN') {
        router.push('/dashboard')
        router.refresh()
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, router])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      
      options: {
          queryParams: {
              hd: 'bmu.edu.in'
          },
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
  }

  const signOut = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    // The onAuthStateChange handler will handle the redirect
  }

  const value = {
    user,
    loading,
    signInWithGoogle,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
