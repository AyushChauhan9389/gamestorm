'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase'
import { QueryData } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import FloatingHeader from '@/components/dashboard/floating-header'
import LeaveGameButton from '@/components/game/leave-game-button'

const supabase = createClient()

const resultsQuery = supabase
  .from('game_participants')
  .select(`
    id,
    user_id,
    total_points_earned,
    profiles (
      display_name,
      handle
    )
  `)

type GameResult = QueryData<typeof resultsQuery>[0]

interface Game {
  id: string
  title: string
  game_code: string
  total_questions: number
}

interface Team {
  id: string
  name: string
  join_code: string
  owner_id: string
  is_finalized: boolean
  mentor_id: string | null
}

interface TeamMembership {
  team_id: string
  role: string
  joined_at: string
  teams: Team
}

export default function ResultsPage() {
  const [game, setGame] = useState<Game | null>(null)
  const [results, setResults] = useState<GameResult[]>([])
  const [userResult, setUserResult] = useState<GameResult | null>(null)
  const [userTeam, setUserTeam] = useState<TeamMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const gameId = params.gameId as string

  useEffect(() => {
    if (!user || !gameId) return

    const fetchResults = async () => {
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

        // Fetch all participants with their scores
        const { data: participantsData, error: participantsError } = await supabase
          .from('game_participants')
          .select(`
            id,
            user_id,
            total_points_earned,
            profiles (
              display_name,
              handle
            )
          `)
          .eq('game_id', gameId)
          .eq('is_completed', true)
          .order('total_points_earned', { ascending: false })

        if (participantsError) {
          setError('Failed to load results')
          setLoading(false)
          return
        }

        const resultsData = participantsData || []
        setResults(resultsData)
        
        // Find current user's result
        const currentUserResult = resultsData.find(r => r.user_id === user.id)
        setUserResult(currentUserResult || null)

        // Check team membership (optional, for consistency)
        try {
          const { data: teamMembership } = await supabase
            .from('team_members')
            .select(`
              team_id,
              role,
              joined_at,
              teams!inner (
                id,
                name,
                join_code,
                owner_id,
                is_finalized,
                mentor_id
              )
            `)
            .eq('user_id', user.id)
            .single()

          if (teamMembership) {
            // Handle the case where teams might be an array or object
            const teamData = Array.isArray(teamMembership.teams) ? teamMembership.teams[0] : teamMembership.teams
            setUserTeam({
              ...teamMembership,
              teams: teamData
            })
          }
        } catch (err) {
          // Team membership is optional for results, so we don't set an error
          console.log('No team membership found for user in results page')
        }

        setLoading(false)
      } catch (err) {
        setError('Failed to load results')
        setLoading(false)
      }
    }

    fetchResults()
  }, [user, gameId, supabase])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-green-100 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-black mb-2">Loading Results...</h2>
          <p className="text-gray-600 font-semibold">📊 Calculating scores! 📈</p>
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
          <Button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[2px] active:translate-y-[2px] transition-all duration-75"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const getUserRank = () => {
    if (!userResult) return 0
    return results.findIndex(r => r.user_id === user?.id) + 1
  }

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈' 
      case 3: return '🥉'
      default: return '🏅'
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-300'
      case 2: return 'bg-gray-300'
      case 3: return 'bg-orange-300'
      default: return 'bg-blue-100'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-green-100 to-blue-100 relative">
      <FloatingHeader />
      
      <div className="container mx-auto p-8 pt-24">
        <div className="max-w-4xl mx-auto">
          {/* Game Complete Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1">
              GAME COMPLETE!
            </h1>
            <div className="bg-green-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1 max-w-2xl mx-auto">
              <h2 className="text-2xl font-black text-black mb-2">{game.title}</h2>
              <p className="text-lg font-bold text-gray-700">Game Code: {game.game_code}</p>
            </div>
          </div>

          {/* User's Result */}
          {userResult && (
            <div className="mb-8">
              <div className={`${getRankColor(getUserRank())} border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1 max-w-md mx-auto text-center`}>
                <div className="text-4xl mb-2">{getRankEmoji(getUserRank())}</div>
                <h3 className="text-2xl font-black text-black mb-2">Your Result</h3>
                <p className="text-xl font-bold text-gray-700 mb-1">
                  Rank: {getUserRank()} of {results.length}
                </p>
                <p className="text-lg font-bold text-gray-700">
                  Points: {userResult.total_points_earned}
                </p>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
            <h3 className="text-3xl font-black text-black mb-6 text-center">🏆 LEADERBOARD 🏆</h3>
            
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={result.id}
                  className={`
                    flex items-center justify-between p-4 border-2 border-black transform hover:rotate-1 transition-transform duration-200
                    ${result.user_id === user?.id ? 'bg-yellow-100 border-yellow-500' : getRankColor(index + 1)}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getRankEmoji(index + 1)}</div>
                    <div className="text-xl font-black text-black">#{index + 1}</div>
                    <div>
                      <p className="font-bold text-lg text-black leading-none">
                        {result.profiles?.[0]?.display_name || result.profiles?.[0]?.handle || `Player ${index + 1}`}
                        {result.user_id === user?.id && <span className="text-blue-600"> (You)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-black">{result.total_points_earned}</p>
                    <p className="text-sm font-bold text-gray-600">points</p>
                  </div>
                </div>
              ))}
            </div>

            {results.length === 0 && (
              <div className="text-center py-8">
                <p className="text-lg font-bold text-gray-600">No completed players yet...</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-8 text-center space-y-4">
            <div className="flex justify-center gap-4">
              <LeaveGameButton gameId={gameId} />
              <Button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-4 text-lg border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[3px] active:translate-y-[3px] transition-all duration-75"
              >
                🎮 Play Another Game
              </Button>
            </div>
            
            <div className="bg-pink-300 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 max-w-md mx-auto transform rotate-2">
              <p className="text-lg font-black text-black">
                🎉 Thanks for playing! 🎈
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
