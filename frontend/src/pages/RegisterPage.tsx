import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth-context'
import { navigateTo } from '../lib/hash-route'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'

export function RegisterPage() {
  const { register, busy, error, clearError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState('')

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        ...(language.trim() ? { language: language.trim() } : {}),
      })
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
            title="Create your account"
            description="Register to report incidents and manage emergency contacts."
            onSubmit={(e: FormEvent) => void onSubmit(e)}
          >
            {error && (
              <Alert variant="danger" title="Registration failed" onClose={clearError}>
                {error}
              </Alert>
            )}
            <Input
              label="Full name"
              name="name"
              autoComplete="name"
              placeholder="Jane Doe"
              requiredMark
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              requiredMark
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Phone number"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              requiredMark
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
              hint="At least 8 characters. Never share your password."
              requiredMark
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              label="Language (optional)"
              name="language"
              placeholder="en"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
            <Button type="submit" fullWidth loading={busy} disabled={busy}>
              Create account
            </Button>
            <p className="text-center text-sm text-ink-500">
              Already have an account?{' '}
              <a href="#/login" className="font-semibold text-gold-700 hover:text-gold-800">
                Log in
              </a>
            </p>
          </Form>
        </CardBody>
      </Card>
    </div>
  )
}
