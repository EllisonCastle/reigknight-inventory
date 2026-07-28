import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { FormRow, Input } from '../components/ui/Field'

export function LoginPage() {
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email.trim(), password)
    } catch {
      setError('Could not sign in — check your email and password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-charcoal">Reigknight</h1>
        <p className="mb-6 text-sm text-gray-500">Sign in to manage inventory and events.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormRow label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </FormRow>
          <FormRow label="Password">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </FormRow>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  )
}
