export default function Loading() {
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
