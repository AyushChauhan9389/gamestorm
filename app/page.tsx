import { redirect } from 'next/navigation'

export default function Home() {
  // This page will be handled by middleware
  // If user is authenticated, they'll be redirected to /dashboard
  // If not authenticated, they'll be redirected to /login
  redirect('/dashboard')
}
