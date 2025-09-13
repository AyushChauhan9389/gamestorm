'use client'

import FloatingHeader from '@/components/dashboard/floating-header'
import { useAuth } from '@/components/auth/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-100 to-green-100 flex items-center justify-center p-4">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-black text-black mb-2">Loading Dashboard...</h2>
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
      
      <div className="container mx-auto p-8 pt-24">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-black text-black mb-4 transform -rotate-1">
            DASHBOARD
          </h1>
          <div className="bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-4 max-w-lg mx-auto transform rotate-1">
            <p className="text-lg font-bold text-black">
              🎮 Welcome to your gaming hub! 🚀
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Game Card 1 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform hover:rotate-1 transition-transform duration-300">
            <div className="w-full h-32 bg-gradient-to-br from-red-400 to-pink-500 border-2 border-black mb-4 flex items-center justify-center">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="text-xl font-black text-black mb-2">Quick Games</h3>
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Jump into fast-paced gaming sessions
            </p>
            <div className="bg-gray-100 border-2 border-black p-2 text-center">
              <span className="text-xs font-bold text-gray-600">Coming Soon!</span>
            </div>
          </div>

          {/* Game Card 2 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform hover:-rotate-1 transition-transform duration-300">
            <div className="w-full h-32 bg-gradient-to-br from-blue-400 to-purple-500 border-2 border-black mb-4 flex items-center justify-center">
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="text-xl font-black text-black mb-2">Tournaments</h3>
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Compete in epic tournament battles
            </p>
            <div className="bg-gray-100 border-2 border-black p-2 text-center">
              <span className="text-xs font-bold text-gray-600">Coming Soon!</span>
            </div>
          </div>

          {/* Game Card 3 */}
          <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6 transform hover:rotate-1 transition-transform duration-300 md:col-span-2 lg:col-span-1">
            <div className="w-full h-32 bg-gradient-to-br from-green-400 to-blue-500 border-2 border-black mb-4 flex items-center justify-center">
              <span className="text-3xl">👥</span>
            </div>
            <h3 className="text-xl font-black text-black mb-2">Team Play</h3>
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Join or create teams for group fun
            </p>
            <div className="bg-gray-100 border-2 border-black p-2 text-center">
              <span className="text-xs font-bold text-gray-600">Coming Soon!</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 transform -rotate-1">
            <h2 className="text-2xl font-black text-black mb-6 text-center">Your Gaming Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-yellow-100 border-2 border-black">
                <div className="text-3xl font-black text-black">0</div>
                <div className="text-sm font-bold text-gray-700">Games Played</div>
              </div>
              <div className="text-center p-4 bg-green-100 border-2 border-black">
                <div className="text-3xl font-black text-black">0</div>
                <div className="text-sm font-bold text-gray-700">Wins</div>
              </div>
              <div className="text-center p-4 bg-blue-100 border-2 border-black">
                <div className="text-3xl font-black text-black">0</div>
                <div className="text-sm font-bold text-gray-700">Points</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Fun Element */}
        <div className="mt-12 text-center">
          <div className="bg-pink-300 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 max-w-md mx-auto transform rotate-2">
            <p className="text-lg font-black text-black">
              🎉 More awesome features coming soon! 🎈
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
