'use client'

import FloatingHeader from '@/components/dashboard/floating-header'
import JoinGameForm from '@/components/game/join-game-form'
import { useAuth } from '@/components/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [checkingGame, setCheckingGame] = useState(true)
  const supabase = createClient()

  // Check for existing game participation
  useEffect(() => {
    const checkExistingGame = async () => {
      if (!user) return

      try {
        // Find any active game participation for this user
        const { data: participant, error } = await supabase
          .from('game_participants')
          .select(`
            game_id,
            is_completed,
            games (
              id,
              is_started,
              status
            )
          `)
          .eq('user_id', user.id)
          .eq('is_completed', false)
          .not('games.status', 'in', '(completed,cancelled)')
          .order('joined_at', { ascending: false })
          .limit(1)

        if (error) {
          console.error('Error checking existing game:', error)
          setCheckingGame(false)
          return
        }

        if (participant && participant.length > 0) {
          const game = participant[0].games?.[0]
          const gameId = participant[0].game_id

          if (game && game.status !== 'completed' && game.status !== 'cancelled') {
            // Redirect to appropriate game page based on status
            if (game.is_started) {
              router.push(`/game/${gameId}`)
            } else {
              router.push(`/game/${gameId}/waiting`)
            }
            return
          }
        }

        setCheckingGame(false)
      } catch (error) {
        console.error('Failed to check existing game:', error)
        setCheckingGame(false)
      }
    }

    if (user && !loading) {
      checkExistingGame()
    }
  }, [user, loading, router, supabase])

  // Also check when component becomes visible (user might navigate back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && !loading && !checkingGame) {
        // Re-check for existing games when page becomes visible
        setCheckingGame(true)
        const checkAgain = async () => {
          try {
            const { data: participant, error } = await supabase
              .from('game_participants')
              .select(`
                game_id,
                is_completed,
                games (
                  id,
                  is_started,
                  status
                )
              `)
              .eq('user_id', user.id)
              .eq('is_completed', false)
              .not('games.status', 'in', '(completed,cancelled)')
              .order('joined_at', { ascending: false })
              .limit(1)

            if (!error && participant && participant.length > 0) {
              const game = participant[0].games?.[0]
              const gameId = participant[0].game_id

              if (game && game.status !== 'completed' && game.status !== 'cancelled') {
                if (game.is_started) {
                  router.push(`/game/${gameId}`)
                } else {
                  router.push(`/game/${gameId}/waiting`)
                }
                return
              }
            }

            setCheckingGame(false)
          } catch (error) {
            setCheckingGame(false)
          }
        }
        checkAgain()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [user, loading, checkingGame, router, supabase])

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading while checking auth or existing game
  if (loading || checkingGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-black mb-2">
            {checkingGame ? 'Checking for Active Games...' : 'Loading Dashboard...'}
          </h2>
          <p className="text-gray-600 font-semibold">🎮 Preparing your gaming hub! 🚀</p>
        </div>
      </div>
    )
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 relative">
      <FloatingHeader />
      
      <div className="container mx-auto p-8 pt-24 flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1">
              JOIN GAME
            </h1>
            <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 transform rotate-1">
              <p className="text-lg font-bold text-black">
                🎮 Enter your game code to join! 🚀
              </p>
            </div>
          </div>

          <JoinGameForm />
        </div>
      </div>
    </div>
  )
}
