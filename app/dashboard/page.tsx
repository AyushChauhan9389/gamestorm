'use client'

import FloatingHeader from '@/components/dashboard/floating-header'
import { useAuth } from '@/components/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'

interface Vote {
  id: string
  title: string
  description: string
  team_names: string[]
  is_started: boolean
  is_completed: boolean
  is_active: boolean
  created_by: string
}

interface VoteSubmission {
  id: string
  vote_id: string
  user_id: string
  ranking_data: string[]
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeVote, setActiveVote] = useState<Vote | null>(null)
  const [userSubmission, setUserSubmission] = useState<VoteSubmission | null>(null)
  const [checkingVote, setCheckingVote] = useState(true)
  const [rankings, setRankings] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const supabase = createClient()

  // Check for active votes and user submissions
  useEffect(() => {
    const checkActiveVote = async () => {
      if (!user) return

      try {
        // Find any active vote that is started but not completed
        const { data: votes, error: voteError } = await supabase
          .from('votes')
          .select('*')
          .eq('is_started', true)
          .eq('is_completed', false)
          .eq('is_active', true)
          .order('started_at', { ascending: false })
          .limit(1)

        if (voteError) {
          console.error('Error checking active vote:', voteError)
          setCheckingVote(false)
          return
        }

        if (votes && votes.length > 0) {
          const vote = votes[0]
          setActiveVote(vote)

          // Check if user has already submitted a vote
          const { data: submission, error: submissionError } = await supabase
            .from('vote_submissions')
            .select('*')
            .eq('vote_id', vote.id)
            .eq('user_id', user.id)
            .single()

          if (!submissionError && submission) {
            setUserSubmission(submission)
            setRankings(submission.ranking_data || [])
          } else {
            // Initialize empty rankings for the teams
            setRankings([])
          }
        }

        setCheckingVote(false)
      } catch (error) {
        console.error('Failed to check active vote:', error)
        setCheckingVote(false)
      }
    }

    if (user && !loading) {
      checkActiveVote()
    }
  }, [user, loading, supabase])

  // Set up realtime subscription for vote updates
  useEffect(() => {
    if (!user) return

    const voteChannel = supabase
      .channel('vote-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        async (payload) => {
          console.log('Vote update received:', payload)
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updatedVote = payload.new as Vote
            
            // If a vote is started, active, and not completed - set it as the active vote
            if (updatedVote.is_started && updatedVote.is_active && !updatedVote.is_completed) {
              setActiveVote(updatedVote)
              
              // Check if user already submitted for this vote
              const { data: submission } = await supabase
                .from('vote_submissions')
                .select('*')
                .eq('vote_id', updatedVote.id)
                .eq('user_id', user.id)
                .single()

              if (submission) {
                setUserSubmission(submission)
                setRankings(submission.ranking_data || [])
              } else {
                setUserSubmission(null)
                setRankings([])
              }
            }
            
            // Clear active vote if it becomes inactive, completed, or stopped
            if (activeVote && updatedVote.id === activeVote.id) {
              if (!updatedVote.is_active || updatedVote.is_completed || !updatedVote.is_started) {
                setActiveVote(null)
                setUserSubmission(null)
                setRankings([])
              }
            }
          }
          
          // Handle vote deletion
          if (payload.eventType === 'DELETE') {
            const deletedVote = payload.old as Vote
            if (activeVote && deletedVote.id === activeVote.id) {
              setActiveVote(null)
              setUserSubmission(null)
              setRankings([])
            }
          }
        }
      )
      .subscribe()

    return () => {
      voteChannel.unsubscribe()
    }
  }, [user, supabase, activeVote])

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Handle team ranking
  const handleTeamRank = (team: string, rank: number) => {
    if (userSubmission) return // Can't change after submission

    const newRankings = [...rankings]
    
    // Remove team from current position if it exists
    const currentIndex = newRankings.indexOf(team)
    if (currentIndex !== -1) {
      newRankings.splice(currentIndex, 1)
    }
    
    // Insert team at new position (rank - 1 for 0-based index)
    const insertIndex = Math.min(rank - 1, newRankings.length)
    newRankings.splice(insertIndex, 0, team)
    
    // Limit to max 5 teams
    if (newRankings.length > 5) {
      newRankings.splice(5)
    }
    
    setRankings(newRankings)
  }

  // Remove team from rankings
  const removeTeamFromRanking = (team: string) => {
    if (userSubmission) return
    setRankings(rankings.filter(t => t !== team))
  }

  // Submit vote
  const submitVote = async () => {
    if (!activeVote || !user || rankings.length === 0) return

    setSubmitting(true)
    setSubmitError('')

    try {
      const { error } = await supabase
        .from('vote_submissions')
        .insert({
          vote_id: activeVote.id,
          user_id: user.id,
          ranking_data: rankings,
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          setSubmitError('You have already submitted a vote for this poll.')
        } else {
          setSubmitError('Failed to submit vote. Please try again.')
        }
        setSubmitting(false)
        return
      }

      // Refresh submission data
      const { data: submission } = await supabase
        .from('vote_submissions')
        .select('*')
        .eq('vote_id', activeVote.id)
        .eq('user_id', user.id)
        .single()

      if (submission) {
        setUserSubmission(submission)
      }

      setSubmitting(false)
    } catch (error) {
      setSubmitError('An unexpected error occurred. Please try again.')
      setSubmitting(false)
    }
  }

  // Show loading while checking auth or vote
  if (loading || checkingVote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-black mb-2">
            {checkingVote ? 'Checking for Active Votes...' : 'Loading Dashboard...'}
          </h2>
          <p className="text-gray-600 font-semibold">🗳️ Preparing your voting hub! 🚀</p>
        </div>
      </div>
    )
  }

  // Don't render if user is not authenticated
  if (!user) {
    return null
  }

  // If there's an active vote, show voting interface
  if (activeVote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 relative">
        <FloatingHeader />
        
        <div className="container mx-auto p-8 pt-24">
          <div className="max-w-4xl mx-auto">
            {/* Vote Info */}
            <div className="text-center mb-8">
              <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1">
                {userSubmission ? 'VOTE SUBMITTED!' : 'LIVE VOTING'}
              </h1>
              <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
                <h2 className="text-2xl font-black text-black mb-2">{activeVote.title}</h2>
                <p className="text-lg font-bold text-gray-700">{activeVote.description}</p>
              </div>
            </div>

            {userSubmission ? (
              // Show submitted rankings
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
                <h3 className="text-2xl font-black text-black mb-4 text-center">Your Rankings</h3>
                <div className="space-y-3">
                  {rankings.map((team, index) => (
                    <div
                      key={team}
                      className="bg-gradient-to-r from-green-100 to-blue-100 border-2 border-black p-4 flex items-center gap-4"
                    >
                      <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-black">
                        {index + 1}
                      </div>
                      <span className="text-lg font-bold text-black">{team}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <p className="text-lg font-bold text-green-700">✅ Vote successfully submitted!</p>
                  <p className="text-sm font-semibold text-gray-600">Thank you for participating!</p>
                </div>
              </div>
            ) : (
              // Show voting interface
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
                  <h3 className="text-xl font-black text-black mb-2 text-center">How to Vote</h3>
                  <p className="text-center font-bold text-gray-700">
                    🗳️ Rank teams from 1-5 by clicking the rank buttons • First = Best • Fifth = Least
                  </p>
                </div>

                {/* Current Rankings Display */}
                {rankings.length > 0 && (
                  <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
                    <h3 className="text-xl font-black text-black mb-4 text-center">Your Current Rankings</h3>
                    <div className="space-y-2">
                      {rankings.map((team, index) => (
                        <div
                          key={team}
                          className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-black p-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center font-black text-sm">
                              {index + 1}
                            </div>
                            <span className="font-bold text-black">{team}</span>
                          </div>
                          <button
                            onClick={() => removeTeamFromRanking(team)}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 border-2 border-black text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teams to Rank */}
                <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
                  <h3 className="text-2xl font-black text-black mb-4 text-center">Select Teams to Rank</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeVote.team_names.map((team) => {
                      const isRanked = rankings.includes(team)
                      const rank = rankings.indexOf(team) + 1
                      
                      return (
                        <div
                          key={team}
                          className={`border-2 border-black p-4 ${
                            isRanked 
                              ? 'bg-gradient-to-br from-green-100 to-blue-100' 
                              : 'bg-gradient-to-br from-gray-100 to-white hover:from-yellow-100 hover:to-orange-100'
                          } transition-colors`}
                        >
                          <h4 className="font-black text-lg text-black mb-3">{team}</h4>
                          {isRanked ? (
                            <div className="flex items-center gap-2">
                              <span className="bg-black text-white px-2 py-1 rounded font-bold text-sm">
                                Ranked #{rank}
                              </span>
                              <button
                                onClick={() => removeTeamFromRanking(team)}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold px-2 py-1 border border-black text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {[1, 2, 3, 4, 5].map((rankNum) => (
                                <button
                                  key={rankNum}
                                  onClick={() => handleTeamRank(team, rankNum)}
                                  disabled={rankings.length >= 5 && rankNum > rankings.length}
                                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold px-3 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[1px] active:translate-y-[1px] transition-all duration-75"
                                >
                                  Rank {rankNum}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                {rankings.length > 0 && (
                  <div className="text-center">
                    {submitError && (
                      <div className="bg-red-100 border-2 border-red-500 p-3 mb-4 transform -rotate-1">
                        <p className="text-red-700 font-bold text-center">{submitError}</p>
                      </div>
                    )}
                    <Button
                      onClick={submitVote}
                      disabled={submitting || rankings.length === 0}
                      className="bg-green-500 hover:bg-green-600 text-white font-black text-xl px-8 py-4 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[3px] active:translate-y-[3px] transition-all duration-75"
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          SUBMITTING...
                        </div>
                      ) : (
                        `🗳️ SUBMIT VOTE (${rankings.length} teams ranked)`
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // No active vote - show waiting screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 relative">
      <FloatingHeader />
      
      <div className="container mx-auto p-8 pt-24 flex items-center justify-center min-h-[calc(100vh-6rem)]">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1">
              VOTE HUB
            </h1>
            <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 transform rotate-1">
              <p className="text-lg font-bold text-black">
                🗳️ Waiting for votes to start! 🚀
              </p>
            </div>
          </div>

          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform hover:rotate-1 transition-transform duration-300">
            <div className="text-center py-8">
              <div className="flex justify-center space-x-2 mb-4">
                <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-4 h-4 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-xl font-black text-black mb-2">No Active Votes</p>
              <p className="text-sm font-bold text-gray-600">You'll be automatically redirected when voting starts!</p>
              <div className="mt-6 p-4 bg-blue-100 border-2 border-black transform rotate-1">
                <p className="text-xs text-black font-bold text-center">
                  🔄 This page automatically updates when votes go live
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}