'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/components/auth/auth-provider'

interface LeaveGameButtonProps {
  gameId: string
  className?: string
}

export default function LeaveGameButton({ gameId, className = '' }: LeaveGameButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()

  const handleLeaveGame = async () => {
    if (!user) return

    setLoading(true)
    
    try {
      // Remove user from game participants
      const { error } = await supabase
        .from('game_participants')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Failed to leave game:', error)
        setLoading(false)
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err) {
      console.error('Error leaving game:', err)
      setLoading(false)
    }
  }

  if (showConfirm) {
    return (
      <div className={`bg-red-100 border-4 border-red-500 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)] p-4 transform -rotate-1 ${className}`}>
        <p className="text-red-800 font-bold text-center mb-3">
          🚨 Are you sure you want to leave this game?
        </p>
        <div className="flex gap-2">
          <Button
            onClick={handleLeaveGame}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[1px] active:translate-y-[1px] transition-all duration-75"
          >
            {loading ? 'Leaving...' : 'Yes, Leave'}
          </Button>
          <Button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            variant="neutral"
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-black font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[1px] active:translate-y-[1px] transition-all duration-75"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Button
      onClick={() => setShowConfirm(true)}
      disabled={loading}
      className={`bg-red-500 hover:bg-red-600 text-white font-bold border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[2px] active:translate-y-[2px] transition-all duration-75 ${className}`}
    >
      🚪 Leave Game
    </Button>
  )
}
