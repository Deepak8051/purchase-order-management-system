
import { useState } from 'react'
import axios from 'axios'
import api from './services/api'
import Dashboard from './pages/Dashboard'

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('accessToken') ?? '',
  )

  const [userRole, setUserRole] = useState(
    () => localStorage.getItem('userRole') ?? '',
  )

  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      })

      const accessToken = response.data.accessToken
      const role = response.data.user?.role

      if (
        typeof accessToken !== 'string' ||
        !accessToken.trim() ||
        typeof role !== 'string' ||
        !role.trim()
      ) {
        setError('Login response is missing a valid token or user role.')
        return
      }

      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('userRole', role)

      setToken(accessToken)
      setUserRole(role)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message

        setError(
          Array.isArray(message)
            ? message.join(', ')
            : typeof message === 'string'
              ? message
              : 'Login failed. Check your credentials and backend.',
        )
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('userRole')
    setToken('')
    setUserRole('')
    setPassword('')
  }

  if (token && userRole) {
    return (
      <Dashboard
        userRole={userRole}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl sm:p-10">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 text-2xl font-bold text-white">
            PO
          </div>

          <h1 className="text-3xl font-bold leading-tight text-slate-900">
            Purchase Order Management
          </h1>

          <p className="mt-3 text-slate-500">
            Sign in to manage your procurement
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
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

        <p className="mt-6 text-center text-xs text-slate-400">
          Secure procurement management
        </p>
      </div>
    </div>
  )
}

export default App
