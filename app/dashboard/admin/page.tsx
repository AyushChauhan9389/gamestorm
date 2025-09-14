'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { createClient } from '@/lib/supabase'
import FloatingHeader from '@/components/dashboard/floating-header'
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
  created_at: string
}

interface VoteSubmission {
  id: string
  vote_id: string
  user_id: string
  ranking_data: string[]
  submitted_at: string
  profile?: {
    display_name?: string
    handle?: string
  } | null
}

interface TeamStats {
  team_name: string
  total_votes: number
  rank_counts: { [rank: number]: number }
  average_rank: number
  total_points: number
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [votes, setVotes] = useState<Vote[]>([])
  const [submissions, setSubmissions] = useState<VoteSubmission[]>([])
  const [leaderboard, setLeaderboard] = useState<TeamStats[]>([])
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()

  // Check admin access
  useEffect(() => {
    if (!loading && user) {
      const adminEmail = 'ayush.chuahan.22cse@bmu.edu.in'
      if (user.email !== adminEmail) {
        router.push('/dashboard')
        return
      }
    }
  }, [user, loading, router])

  // Fetch votes and submissions
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch all votes
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('*')
          .order('created_at', { ascending: false })

        if (votesError) {
          console.error('Error fetching votes:', votesError)
          return
        }

        setVotes(votesData || [])

        // Set the most recent active vote as selected by default
        const activeVote = votesData?.find(v => v.is_active && v.is_started && !v.is_completed)
        if (activeVote) {
          setSelectedVote(activeVote)
        }

        setLoadingData(false)
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setLoadingData(false)
      }
    }

    if (user && user.email === 'ayush.chuahan.22cse@bmu.edu.in') {
      fetchData()
    }
  }, [user, supabase])

  // Fetch submissions for selected vote
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedVote) {
        setSubmissions([])
        return
      }

      try {
        // Fetch submissions first
        const { data: submissionsData, error: submissionsError } = await supabase
          .from('vote_submissions')
          .select('*')
          .eq('vote_id', selectedVote.id)
          .order('submitted_at', { ascending: false })

        if (submissionsError) {
          console.error('Error fetching submissions:', submissionsError)
          return
        }

        // Fetch user profiles separately
        if (submissionsData && submissionsData.length > 0) {
          const userIds = submissionsData.map(sub => sub.user_id)
          
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, display_name, handle')
            .in('id', userIds)

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
          }

          // Merge submission data with profile data
          const enrichedSubmissions = submissionsData.map(submission => ({
            ...submission,
            profile: profilesData?.find(profile => profile.id === submission.user_id) || null
          }))

          setSubmissions(enrichedSubmissions)
        } else {
          setSubmissions(submissionsData || [])
        }
      } catch (error) {
        console.error('Failed to fetch submissions:', error)
      }
    }

    fetchSubmissions()
  }, [selectedVote, supabase])

  // Calculate leaderboard
  useEffect(() => {
    if (!selectedVote || submissions.length === 0) {
      setLeaderboard([])
      return
    }

    const teamStats: { [teamName: string]: TeamStats } = {}

    // Initialize team stats
    selectedVote.team_names.forEach(teamName => {
      teamStats[teamName] = {
        team_name: teamName,
        total_votes: 0,
        rank_counts: {},
        average_rank: 0,
        total_points: 0
      }
    })

    // Process submissions
    submissions.forEach(submission => {
      submission.ranking_data.forEach((teamName, index) => {
        const rank = index + 1 // 1-based ranking
        const points = Math.max(0, 6 - rank) // 5 points for 1st, 4 for 2nd, etc.

        if (teamStats[teamName]) {
          teamStats[teamName].total_votes++
          teamStats[teamName].rank_counts[rank] = (teamStats[teamName].rank_counts[rank] || 0) + 1
          teamStats[teamName].total_points += points
        }
      })
    })

    // Calculate average ranks
    Object.keys(teamStats).forEach(teamName => {
      const stats = teamStats[teamName]
      if (stats.total_votes > 0) {
        let totalRankSum = 0
        Object.keys(stats.rank_counts).forEach(rank => {
          totalRankSum += parseInt(rank) * stats.rank_counts[parseInt(rank)]
        })
        stats.average_rank = totalRankSum / stats.total_votes
      } else {
        stats.average_rank = 6 // Unranked teams get worst rank
      }
    })

    // Sort by total points (descending), then by average rank (ascending)
    const sortedLeaderboard = Object.values(teamStats).sort((a, b) => {
      if (b.total_points !== a.total_points) {
        return b.total_points - a.total_points
      }
      return a.average_rank - b.average_rank
    })

    setLeaderboard(sortedLeaderboard)
  }, [selectedVote, submissions])

  // Set up realtime subscriptions
  useEffect(() => {
    if (!user || user.email !== 'ayush.chuahan.22cse@bmu.edu.in') return

    // Subscribe to vote changes
    const voteChannel = supabase
      .channel('admin-vote-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        async (payload) => {
          console.log('Admin vote update:', payload)
          
          // Refetch votes
          const { data: votesData } = await supabase
            .from('votes')
            .select('*')
            .order('created_at', { ascending: false })

          if (votesData) {
            setVotes(votesData)
          }
        }
      )
      .subscribe()

    // Subscribe to submission changes
    const submissionChannel = supabase
      .channel('admin-submission-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vote_submissions',
        },
        async (payload) => {
          console.log('Admin submission update:', payload)
          
          // Refetch submissions for current vote
          if (selectedVote) {
            const { data: submissionsData } = await supabase
              .from('vote_submissions')
              .select('*')
              .eq('vote_id', selectedVote.id)
              .order('submitted_at', { ascending: false })

            if (submissionsData && submissionsData.length > 0) {
              const userIds = submissionsData.map(sub => sub.user_id)
              
              const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, display_name, handle')
                .in('id', userIds)

              const enrichedSubmissions = submissionsData.map(submission => ({
                ...submission,
                profile: profilesData?.find(profile => profile.id === submission.user_id) || null
              }))

              setSubmissions(enrichedSubmissions)
            } else {
              setSubmissions(submissionsData || [])
            }
          }
        }
      )
      .subscribe()

    return () => {
      voteChannel.unsubscribe()
      submissionChannel.unsubscribe()
    }
  }, [user, supabase, selectedVote])

  // Redirect if not authorized
  if (!loading && (!user || user.email !== 'ayush.chuahan.22cse@bmu.edu.in')) {
    return null
  }

  // Show loading
  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-100 via-orange-100 to-yellow-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-black mb-2">Loading Admin Dashboard...</h2>
          <p className="text-gray-600 font-semibold">📊 Preparing voting analytics! 🚀</p>
        </div>
      </div>
    )
  }

  // Admin controls for vote management
  const toggleVoteStatus = async (voteId: string, field: 'is_active' | 'is_started' | 'is_completed', value: boolean) => {
    try {
      const updateData: any = { [field]: value }
      
      // Set timestamps
      if (field === 'is_started' && value) {
        updateData.started_at = new Date().toISOString()
      } else if (field === 'is_completed' && value) {
        updateData.completed_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('votes')
        .update(updateData)
        .eq('id', voteId)

      if (error) {
        console.error('Error updating vote:', error)
      }
    } catch (error) {
      console.error('Failed to update vote:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-orange-100 to-yellow-100 relative">
      <FloatingHeader />
      
      <div className="container mx-auto p-8 pt-24">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1">
              ADMIN DASHBOARD
            </h1>
            <div className="bg-red-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 transform rotate-1">
              <p className="text-lg font-bold text-black">
                📊 Real-time Voting Analytics & Control Panel 🎯
              </p>
            </div>
          </div>

          {/* Vote Selection */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 mb-6 transform -rotate-1">
            <h2 className="text-2xl font-black text-black mb-4">Select Vote to Monitor</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {votes.map((vote) => (
                <div
                  key={vote.id}
                  className={`border-2 border-black p-4 cursor-pointer transition-colors ${
                    selectedVote?.id === vote.id
                      ? 'bg-gradient-to-br from-green-200 to-blue-200'
                      : 'bg-gradient-to-br from-gray-100 to-white hover:from-yellow-100 hover:to-orange-100'
                  }`}
                  onClick={() => setSelectedVote(vote)}
                >
                  <h3 className="font-black text-lg text-black mb-2">{vote.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{vote.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${vote.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="text-xs font-bold">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${vote.is_started ? 'bg-blue-500' : 'bg-gray-400'}`}></span>
                      <span className="text-xs font-bold">Started</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${vote.is_completed ? 'bg-red-500' : 'bg-gray-400'}`}></span>
                      <span className="text-xs font-bold">Completed</span>
                    </div>
                  </div>

                  {/* Quick Controls */}
                  {selectedVote?.id === vote.id && (
                    <div className="mt-4 pt-4 border-t-2 border-black space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleVoteStatus(vote.id, 'is_active', !vote.is_active)
                          }}
                          className={`text-xs px-2 py-1 font-bold border-2 border-black ${
                            vote.is_active 
                              ? 'bg-red-500 hover:bg-red-600 text-white' 
                              : 'bg-green-500 hover:bg-green-600 text-white'
                          }`}
                        >
                          {vote.is_active ? 'Deactivate' : 'Activate'}
                        </Button>
                        
                        {vote.is_active && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleVoteStatus(vote.id, 'is_started', !vote.is_started)
                            }}
                            disabled={vote.is_completed}
                            className={`text-xs px-2 py-1 font-bold border-2 border-black ${
                              vote.is_started 
                                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                          >
                            {vote.is_started ? 'Stop' : 'Start'}
                          </Button>
                        )}
                        
                        {vote.is_started && !vote.is_completed && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleVoteStatus(vote.id, 'is_completed', true)
                            }}
                            className="text-xs px-2 py-1 font-bold border-2 border-black bg-red-600 hover:bg-red-700 text-white"
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedVote && (
            <>
              {/* Live Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
                  <h3 className="text-xl font-black text-black mb-2">Total Votes</h3>
                  <p className="text-4xl font-black text-blue-600">{submissions.length}</p>
                </div>
                
                <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
                  <h3 className="text-xl font-black text-black mb-2">Teams</h3>
                  <p className="text-4xl font-black text-green-600">{selectedVote.team_names.length}</p>
                </div>
                
                <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
                  <h3 className="text-xl font-black text-black mb-2">Status</h3>
                  <p className={`text-2xl font-black ${
                    selectedVote.is_completed ? 'text-red-600' :
                    selectedVote.is_started ? 'text-green-600' : 'text-orange-600'
                  }`}>
                    {selectedVote.is_completed ? 'COMPLETED' :
                     selectedVote.is_started ? 'LIVE' : 'WAITING'}
                  </p>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform rotate-1">
                <h2 className="text-3xl font-black text-black mb-6 text-center">🏆 LIVE LEADERBOARD 🏆</h2>
                
                {leaderboard.length > 0 ? (
                  <div className="space-y-4">
                    {leaderboard.map((team, index) => (
                      <div
                        key={team.team_name}
                        className={`border-2 border-black p-4 ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-200 to-yellow-300' :
                          index === 1 ? 'bg-gradient-to-r from-gray-200 to-gray-300' :
                          index === 2 ? 'bg-gradient-to-r from-orange-200 to-orange-300' :
                          'bg-gradient-to-r from-blue-100 to-purple-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-black text-xl ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-gray-500 text-white' :
                              index === 2 ? 'bg-orange-500 text-white' :
                              'bg-blue-500 text-white'
                            }`}>
                              #{index + 1}
                            </div>
                            <div>
                              <h3 className="text-xl font-black text-black">{team.team_name}</h3>
                              <p className="text-sm font-bold text-gray-600">
                                {team.total_votes} votes • Avg Rank: {team.average_rank.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-2xl font-black text-black">{team.total_points} pts</p>
                            <div className="flex gap-1 mt-1">
                              {[1, 2, 3, 4, 5].map(rank => (
                                <div key={rank} className="text-xs">
                                  <span className="font-bold">#{rank}:</span>
                                  <span className="ml-1">{team.rank_counts[rank] || 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xl font-bold text-gray-600">No votes submitted yet</p>
                    <p className="text-sm text-gray-500">Leaderboard will update in real-time as votes come in!</p>
                  </div>
                )}
              </div>

              {/* Recent Submissions */}
              <div className="mt-6 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
                <h2 className="text-2xl font-black text-black mb-4">Recent Submissions</h2>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="border border-gray-300 p-3 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-sm">
                            {submission.profile?.display_name || submission.profile?.handle || 'Anonymous'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(submission.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold">Rankings:</p>
                          <p className="text-xs">
                            {submission.ranking_data.map((team, index) => `${index + 1}. ${team}`).join(' • ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
