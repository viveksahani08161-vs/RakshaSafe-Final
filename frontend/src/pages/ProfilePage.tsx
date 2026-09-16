import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'

function formatDate(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString()
}

export function ProfilePage() {
  const { user: authUser, updateProfile, busy, error, clearError } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('')
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  if (!authUser) return null
  const user = authUser

  function startEditing(): void {
    setName(user.name)
    setEmail(user.email)
    setPhone(user.phone)
    setLanguage(user.language ?? '')
    setSaved(false)
    setEditing(true)
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSaved(false)
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        language: language.trim() === '' ? undefined : language.trim(),
      })
      setSaved(true)
      setEditing(false)
    } catch {
      /* error is surfaced through context */
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Card>
        <CardHeader
          title="Your profile"
          description="Account information stored in the Users collection."
          action={
            <Badge variant={user.role === 'ADMIN' ? 'secondary' : 'primary'} dot>
              {user.role}
            </Badge>
          }
        />
        <CardBody>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-ink-500">Name</dt>
              <dd className="mt-0.5 text-ink-900">{user.name}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">Email</dt>
              <dd className="mt-0.5 break-all text-ink-900">{user.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">Phone</dt>
              <dd className="mt-0.5 text-ink-900">{user.phone}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">Language</dt>
              <dd className="mt-0.5 text-ink-900">{user.language ?? '—'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-ink-500">Member since</dt>
              <dd className="mt-0.5 text-ink-900">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
          {!editing && (
            <div className="pt-2">
              <Button variant="outline" onClick={startEditing}>
                Edit profile
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {editing && (
        <Card>
          <CardBody>
            <Form title="Update profile" onSubmit={(e: FormEvent) => void onSubmit(e)}>
              {error && (
                <Alert variant="danger" title="Update failed" onClose={clearError}>
                  {error}
                </Alert>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={busy} disabled={busy}>
                  Save changes
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </Form>
          </CardBody>
        </Card>
      )}

      {saved && !editing && (
        <Alert variant="success" title="Profile updated" onClose={() => setSaved(false)}>
          Your profile information has been saved.
        </Alert>
      )}
    </div>
  )
}
