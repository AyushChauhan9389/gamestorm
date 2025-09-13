'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase'

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

export default function JoinGameForm() {
  const [gameCode, setGameCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userTeam, setUserTeam] = useState<TeamMembership | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  // Check team membership and existing game participation on component mount
  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return

      try {
        // First, check if user is already in an active game
        const { data: participant, error: participantError } = await supabase
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

        if (!participantError && participant && participant.length > 0) {
          const game = participant[0].games?.[0]
          const gameId = participant[0].game_id

          if (game && game.status !== 'completed' && game.status !== 'cancelled') {
            // User is already in an active game, redirect them
            if (game.is_started) {
              router.push(`/game/${gameId}`)
            } else {
              router.push(`/game/${gameId}/waiting`)
            }
            return
          }
        }

        // If not in an active game, check team membership
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
        console.log('Error checking user status')
      } finally {
        setCheckingStatus(false)
      }
    }

    checkUserStatus()
  }, [user, supabase, router])

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      setError('Please enter a game code')
      return
    }

    if (!user) {
      setError('You must be logged in to join a game')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Find the game by code
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('game_code', gameCode.trim().toUpperCase())
        .single()

      if (gameError || !game) {
        setError('Game not found. Please check your code.')
        setLoading(false)
        return
      }

      if (game.status === 'completed' || game.status === 'cancelled') {
        setError('This game has ended.')
        setLoading(false)
        return
      }

      // Check if user is already a participant
      const { data: existingParticipant } = await supabase
        .from('game_participants')
        .select('*')
        .eq('game_id', game.id)
        .eq('user_id', user.id)
        .single()

      // Check if user is a member of any team (refresh in case it changed)
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
        console.log('User is a member of team:', teamData)
        // You can add team-specific logic here if needed
        // For example, you could show team information or handle team-based game logic
      }

      if (!existingParticipant) {
        // Add user as participant
        const { error: participantError } = await supabase
          .from('game_participants')
          .insert({
            game_id: game.id,
            user_id: user.id,
            joined_at: new Date().toISOString(),
            last_active_at: new Date().toISOString(),
          })

        if (participantError) {
          setError('Failed to join game. Please try again.')
          setLoading(false)
          return
        }
      }

      // Redirect based on game status
      if (game.is_started) {
        router.push(`/game/${game.id}`)
      } else {
        router.push(`/game/${game.id}/waiting`)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  // Show loading while checking user status
  if (checkingStatus) {
    return (
      <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform hover:rotate-1 transition-transform duration-300">
        <div className="text-center py-8">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold text-gray-600">Checking your status...</p>
          <p className="text-sm text-gray-500">🎮 Setting up your game experience! 🚀</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform hover:rotate-1 transition-transform duration-300">
      <div className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Enter game code (e.g. ABC123)"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.toUpperCase())}
            className="text-center text-2xl font-bold tracking-wider border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] transition-all duration-75"
            maxLength={10}
            disabled={loading}
          />
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-500 p-3 transform -rotate-1">
            <p className="text-red-700 font-bold text-center text-sm">{error}</p>
          </div>
        )}

        {userTeam && (
          <div className="bg-green-100 border-2 border-green-500 p-3 transform rotate-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">✓</span>
              </div>
              <div>
                <p className="text-green-700 font-bold text-sm">Team Member Detected!</p>
                <p className="text-green-600 text-xs">
                  Connected to: <span className="font-bold">{userTeam.teams.name}</span>
                  {userTeam.role === 'owner' && <span className="ml-1">(Team Leader)</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleJoinGame}
          disabled={loading || !gameCode.trim()}
          className="w-full h-14 text-xl font-black bg-green-500 hover:bg-green-600 text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[3px] active:translate-y-[3px] transition-all duration-75"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              JOINING...
            </div>
          ) : (
            '🚀 JOIN GAME!'
          )}
        </Button>

        <div className="text-center">
          <p className="text-sm font-bold text-gray-600">
            Game codes are usually 6 characters long
          </p>
        </div>
      </div>
    </div>
  )
}
