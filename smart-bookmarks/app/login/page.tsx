import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  async function handleGoogleLogin() {
    'use server'
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://smart-bookmarks-chi.vercel.app'}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      console.error('OAuth error:', error)
      redirect('/login?error=oauth_failed')
    }

    if (data.url) {
      redirect(data.url)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Smart Bookmarks</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage your bookmarks</p>
        </div>
        <form action={handleGoogleLogin}>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  )
}
