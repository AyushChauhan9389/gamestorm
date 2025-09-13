'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase'
import { QueryData } from '@supabase/supabase-js'
import FloatingHeader from '@/components/dashboard/floating-header'
import LeaveGameButton from '@/components/game/leave-game-button'

interface Game {
  id: string
  title: string
  description: string
  game_code: string
  is_started: boolean
  status: string
  max_participants: number
}

const supabase = createClient()

const participantsQuery = supabase
  .from('game_participants')
  .select(`
    id,
    user_id,
    profiles (
      display_name,
      handle
    )
  `)

type Participant = QueryData<typeof participantsQuery>[0]

export default function WaitingPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const gameId = params.gameId as string

  useEffect(() => {
    if (!user || !gameId) return

    const fetchGameData = async () => {
      try {
        // Fetch game details
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('id', gameId)
          .single()

        if (gameError || !gameData) {
          setError('Game not found')
          setLoading(false)
          return
        }

        setGame(gameData)

        // If game is already started, redirect to game page
        if (gameData.is_started) {
          router.push(`/game/${gameId}`)
          return
        }

        // Fetch participants
        const { data: participantData, error: participantError } = await supabase
          .from('game_participants')
          .select(`
            id,
            user_id,
            profiles (
              display_name,
              handle
            )
          `)
          .eq('game_id', gameId)

        if (!participantError && participantData) {
          setParticipants(participantData)
        }

        setLoading(false)
      } catch (err) {
        setError('Failed to load game data')
        setLoading(false)
      }
    }

    fetchGameData()

    // Set up realtime subscriptions after initial data load
    setTimeout(() => {
      console.log('Setting up realtime subscriptions for game:', gameId)
    }, 1000)

    // Set up realtime subscription for game updates
    const gameChannel = supabase
      .channel(`game-updates-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game update received:', payload)
          const updatedGame = payload.new as Game
          setGame(updatedGame)
          
          // Redirect to game page when started
          if (updatedGame.is_started) {
            router.push(`/game/${gameId}`)
          }
        }
      )
      .subscribe((status) => {
        console.log('Game channel subscription status:', status)
      })

    // Set up realtime subscription for participant updates
    const participantChannel = supabase
      .channel(`participant-updates-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          console.log('Participant update received:', payload)
          
          // Refetch participants when changes occur
          try {
            const { data, error } = await supabase
              .from('game_participants')
              .select(`
                id,
                user_id,
                profiles (
                  display_name,
                  handle
                )
              `)
              .eq('game_id', gameId)

            if (error) {
              console.error('Error refetching participants:', error)
              return
            }

            if (data) {
              console.log('Updated participants:', data)
              setParticipants(data)
            }
          } catch (err) {
            console.error('Failed to refetch participants:', err)
          }
        }
      )
      .subscribe((status) => {
        console.log('Participant channel subscription status:', status)
      })

    return () => {
      gameChannel.unsubscribe()
      participantChannel.unsubscribe()
    }
  }, [user, gameId, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-black mb-2">Loading Game...</h2>
          <p className="text-gray-600 font-semibold">🎮 Getting everything ready! 🚀</p>
        </div>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 via-orange-100 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-black text-black mb-2">Oops!</h2>
          <p className="text-gray-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[2px] active:translate-y-[2px] transition-all duration-75"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 relative">
      <FloatingHeader />
      
      <div className="container mx-auto p-8 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* Game Info */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1">
              WAITING ROOM
            </h1>
            <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1 max-w-2xl mx-auto">
              <h2 className="text-2xl font-black text-black mb-2">{game.title}</h2>
              <p className="text-lg font-bold text-gray-700 mb-2">{game.description}</p>
              <p className="text-sm font-bold text-gray-600">Game Code: {game.game_code}</p>
            </div>
          </div>

          {/* Waiting Animation */}
          <div className="text-center mb-8">
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 transform -rotate-1 max-w-md mx-auto">
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-xl font-black text-black mb-2">Waiting for Host</p>
              <p className="text-sm font-bold text-gray-600">The game will start automatically when the host begins!</p>
            </div>
          </div>

          {/* Leave Game Button */}
          <div className="text-center mb-6">
            <LeaveGameButton gameId={gameId} />
          </div>

          {/* Participants List */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
            <h3 className="text-2xl font-black text-black mb-4 text-center">
              Players Joined ({participants.length}/{game.max_participants || 50})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-black p-3 transform hover:rotate-1 transition-transform duration-200"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full border-2 border-black flex items-center justify-center">
                      <span className="text-xs font-black text-white">
                        {(participant.profiles?.[0]?.display_name || participant.profiles?.[0]?.handle || 'P')?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-black leading-none">
                        {participant.profiles?.[0]?.display_name || participant.profiles?.[0]?.handle || `Player ${index + 1}`}
                      </p>
                      <p className="text-xs text-gray-600 font-semibold">
                        {participant.user_id === user?.id ? 'You' : 'Player'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {participants.length === 0 && (
              <div className="text-center py-8">
                <p className="text-lg font-bold text-gray-600">No players yet... be the first!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
