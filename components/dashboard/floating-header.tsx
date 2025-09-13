'use client'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'

export default function FloatingHeader() {
  const { user, signOut } = useAuth()

  return (
    <header className="fixed top-4 right-4 z-50">
      <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 transform rotate-2 hover:rotate-0 transition-transform duration-300">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-pink-500 rounded-full border-2 border-black flex items-center justify-center">
              <span className="text-xs font-black text-white">
                {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
              </span>
            </div>
            <div className="hidden sm:block">
              <p className="font-bold text-sm text-black leading-none">
                {user?.user_metadata?.name || user?.email || 'Player'}
              </p>
              <p className="text-xs text-gray-600 font-semibold leading-none">
                Ready to play!
              </p>
            </div>
          </div>
          
          <Button
            onClick={signOut}
            variant="neutral"
            size="sm"
            className="font-bold border-2 border-black bg-red-100 hover:bg-red-200 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:shadow-none transform active:translate-x-[1px] active:translate-y-[1px] transition-all duration-75"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
