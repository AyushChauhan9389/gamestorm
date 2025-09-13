'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase'
import GameQuestion from '@/components/game/game-question'
import FloatingHeader from '@/components/dashboard/floating-header'
import LeaveGameButton from '@/components/game/leave-game-button'

interface Game {
  id: string
  title: string
  description: string
  game_code: string
  is_started: boolean
  status: string
  total_questions: number
}

interface GameQuestion {
  id: string
  game_id: string
  question_index: number
  image_url: string | null
  question_text: string
  options: string[]
  reveal_time_seconds: number
  total_points_can_be_earned: number
  question_duration_seconds: number
}

interface GameParticipant {
  id: string
  current_question_index: number
  total_points_earned: number
  is_completed: boolean
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

export default function GamePage() {
  const [game, setGame] = useState<Game | null>(null)
  const [questions, setQuestions] = useState<GameQuestion[]>([])
  const [participant, setParticipant] = useState<GameParticipant | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<GameQuestion | null>(null)
  const [userTeam, setUserTeam] = useState<TeamMembership | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const supabase = createClient()
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

        // If game is not started, redirect to waiting page
        if (!gameData.is_started) {
          router.push(`/game/${gameId}/waiting`)
          return
        }

        // Fetch participant data
        const { data: participantData, error: participantError } = await supabase
          .from('game_participants')
          .select('*')
          .eq('game_id', gameId)
          .eq('user_id', user.id)
          .single()

        if (participantError || !participantData) {
          setError('You are not a participant in this game')
          setLoading(false)
          return
        }

        setParticipant(participantData)

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
          // Team membership is optional for game play, so we don't set an error
          console.log('No team membership found for user in game page')
        }

        // Check if game is completed
        if (participantData.is_completed) {
          router.push(`/game/${gameId}/results`)
          return
        }

        // Fetch all questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('game_questions')
          .select('*')
          .eq('game_id', gameId)
          .order('question_index', { ascending: true })

        if (questionsError) {
          setError('Failed to load questions')
          setLoading(false)
          return
        }

        setQuestions(questionsData || [])
        
        // Set current question based on participant's progress
        const currentQ = questionsData?.find(q => q.question_index === participantData.current_question_index)
        setCurrentQuestion(currentQ || null)

        setLoading(false)
      } catch (err) {
        setError('Failed to load game data')
        setLoading(false)
      }
    }

    fetchGameData()

    // Set up realtime subscription for participant updates
    const participantChannel = supabase
      .channel('participant-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_participants',
          filter: `game_id=eq.${gameId}&user_id=eq.${user.id}`,
        },
        (payload) => {
          const updatedParticipant = payload.new as GameParticipant
          setParticipant(updatedParticipant)
          
          // Update current question based on progress
          const nextQ = questions.find(q => q.question_index === updatedParticipant.current_question_index)
          setCurrentQuestion(nextQ || null)

          // Redirect to results if completed
          if (updatedParticipant.is_completed) {
            router.push(`/game/${gameId}/results`)
          }
        }
      )
      .subscribe()

    return () => {
      participantChannel.unsubscribe()
    }
  }, [user, gameId, router, supabase, questions])

  const handleQuestionComplete = async (pointsEarned: number) => {
    if (!participant || !currentQuestion) return

    try {
      // Update participant progress
      const nextQuestionIndex = participant.current_question_index + 1
      const isGameCompleted = nextQuestionIndex >= questions.length

      await supabase
        .from('game_participants')
        .update({
          current_question_index: nextQuestionIndex,
          total_points_earned: participant.total_points_earned + pointsEarned,
          is_completed: isGameCompleted,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', participant.id)

      // Move to next question or complete game
      if (isGameCompleted) {
        router.push(`/game/${gameId}/results`)
      } else {
        const nextQuestion = questions.find(q => q.question_index === nextQuestionIndex)
        setCurrentQuestion(nextQuestion || null)
        setParticipant(prev => prev ? {
          ...prev,
          current_question_index: nextQuestionIndex,
          total_points_earned: prev.total_points_earned + pointsEarned,
          is_completed: isGameCompleted
        } : null)
      }
    } catch (err) {
      console.error('Failed to update progress:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-black mb-2">Loading Game...</h2>
          <p className="text-gray-600 font-semibold">🎮 Get ready to play! 🚀</p>
        </div>
      </div>
    )
  }

  if (error || !game || !participant) {
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

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏁</div>
          <h2 className="text-2xl font-black text-black mb-2">Game Complete!</h2>
          <p className="text-gray-600 font-semibold mb-4">Redirecting to results...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 relative">
      <FloatingHeader />
      
      <div className="container mx-auto p-4 pt-20">
        {/* Game Progress */}
        <div className="mb-6">
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform -rotate-1 max-w-md mx-auto text-center">
            <p className="text-lg font-black text-black">
              Question {participant.current_question_index + 1} of {questions.length}
            </p>
            <p className="text-sm font-bold text-gray-600">
              Total Points: {participant.total_points_earned}
            </p>
          </div>
        </div>

        {/* Leave Game Button - positioned in top corner */}
        <div className="absolute top-24 left-4 z-40">
          <LeaveGameButton gameId={gameId} className="text-sm px-3 py-2" />
        </div>

        {/* Current Question */}
        <GameQuestion
          question={currentQuestion}
          participantId={participant.id}
          onComplete={handleQuestionComplete}
        />
      </div>
    </div>
  )
}
