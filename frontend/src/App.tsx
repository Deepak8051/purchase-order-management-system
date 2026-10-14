
import { useState } from 'react'
import api from './services/api'
import axios from 'axios'

function App() {
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })

      const token =
        response.data.accessToken ??
        response.data.access_token ??
        response.data.token

      if (!token) {
        setError('Login succeeded, but no access token was found in the response.')
        return
      }

      localStorage.setItem('accessToken', token)
      setSuccess(true)
    
} catch (err: unknown) {
  if (axios.isAxiosError(err)) {
    setError(
      err.response?.data?.message ??
        'Unable to log in. Check your credentials and backend server.',
    )
  } else {
    setError('An unexpected error occurred.')
  }
} finally {
  setLoading(false)
}

  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white">
            PO
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Purchase Order Management
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your procurement
          </p>
        </div>

        {success ? (
          <div className="rounded-lg bg-green-50 p-4 text-center text-green-700">
            Login successful! Your access token has been saved.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure procurement management
        </p>
      </div>
    </div>
  )
}

export default App
