import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth-context'
import { useI18n, type DictKey } from '../lib/i18n'
import { navigateTo } from '../lib/hash-route'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ''
  let normalized = trimmed.replace(/^\+91[\s-]?/, '').replace(/[\s-]/g, '')
  return normalized
}

function validateIdentifier(identifier: string): string | null {
  const trimmed = identifier.trim()
  if (!trimmed) return 'validation.required'
  const lower = trimmed.toLowerCase()
  // Check if it's an email
  if (EMAIL_REGEX.test(lower)) return null
  // Check if it's a valid Indian phone
  const normalized = normalizePhone(trimmed)
  if (PHONE_REGEX.test(trimmed) && normalized.length === 10) return null
  return 'validation.email'
}

function validatePassword(password: string): string | null {
  if (!password) return 'validation.required'
  return null
}

export function LoginPage() {
  const { login, busy, error, clearError } = useAuth()
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    const identifierError = validateIdentifier(identifier)
    if (identifierError) errors.identifier = identifierError
    const passwordError = validatePassword(password)
    if (passwordError) errors.password = passwordError
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const trimmed = identifier.trim()
      const lower = trimmed.toLowerCase()
      // If it's an email, use lowercase; if phone, normalize
      const normalizedIdentifier = EMAIL_REGEX.test(lower) ? lower : normalizePhone(trimmed)
      await login(normalizedIdentifier, password)
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
            title={t('login.title')}
            description={t('login.description')}
            onSubmit={(e: FormEvent) => void onSubmit(e)}
          >
            {error && (
              <Alert variant="danger" title={t('login.errorTitle')} onClose={clearError}>
                {error}
              </Alert>
            )}
            <Input
              label={t('login.emailPhone')}
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder={t('login.emailPhonePlaceholder')}
              requiredMark
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              error={fieldErrors.identifier ? t(fieldErrors.identifier as DictKey) : undefined}
            />
            <Input
              label={t('login.password')}
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('login.passwordPlaceholder')}
              requiredMark
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password ? t(fieldErrors.password as DictKey) : undefined}
            />
            <Button type="submit" fullWidth loading={busy} disabled={busy}>
              {busy ? t('login.submitting') : t('login.submit')}
            </Button>
            <p className="text-center text-sm text-ink-500">
              {t('login.registerLink', { appName: 'RakshaSafe' })}
            </p>
          </Form>
        </CardBody>
      </Card>
    </div>
  )
}