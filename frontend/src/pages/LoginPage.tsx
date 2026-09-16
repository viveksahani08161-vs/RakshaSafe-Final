import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth-context'
import { navigateTo } from '../lib/hash-route'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'

export function LoginPage() {
  const { login, busy, error, clearError } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    try {
      await login(identifier.trim(), password)
      navigateTo('/dashboard')
    } catch {
      /* error is surfaced through context */
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Card>
        <CardBody>
          <Form
            title="Welcome back"
            description="Log in to manage your safety profile and incidents."
            onSubmit={(e: FormEvent) => void onSubmit(e)}
          >
            {error && (
              <Alert variant="danger" title="Login failed" onClose={clearError}>
                {error}
              </Alert>
            )}
            <Input
              label="Email or phone number"
              name="identifier"
              autoComplete="username"
              placeholder="you@example.com"
              requiredMark
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              requiredMark
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" fullWidth loading={busy} disabled={busy}>
              Log in
            </Button>
            <p className="text-center text-sm text-ink-500">
              New to RakshaSafe?{' '}
              <a href="#/register" className="font-semibold text-gold-700 hover:text-gold-800">
                Create an account
              </a>
            </p>
          </Form>
        </CardBody>
      </Card>
    </div>
  )
}
