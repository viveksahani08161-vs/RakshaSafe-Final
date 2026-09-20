import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth-context'
import { useI18n, type DictKey } from '../lib/i18n'
import { navigateTo } from '../lib/hash-route'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { Logo } from '../components/ui/Logo'
import { EyeIcon, EyeOffIcon, ShieldIcon } from '../components/ui/icons'

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
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <Logo size="lg" />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">{t('login.title')}</h1>
          <p className="mt-1 text-sm text-ink-500">{t('login.subtitle')}</p>
        </div>
      </div>
      <Card className="shadow-md shadow-ink-900/5">
        <CardBody>
          <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
            {error && (
              <Alert variant="danger" title={t('login.errorTitle')} onClose={clearError}>
                {error}
              </Alert>
            )}
            <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5">
              <ShieldIcon className="size-5 shrink-0 text-sky-600" />
              <p className="text-xs font-medium text-sky-900">{t('auth.securityNote')}</p>
            </div>
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('login.passwordPlaceholder')}
              requiredMark
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password ? t(fieldErrors.password as DictKey) : undefined}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              }
            />
            <Button type="submit" fullWidth loading={busy} disabled={busy}>
              {busy ? t('login.submitting') : t('login.submit')}
            </Button>
            <div className="border-t border-ink-100 pt-4 text-center">
              <p className="mb-2 text-sm text-ink-500">{t('login.registerPrefix')}</p>
              <Button type="button" variant="outline" fullWidth onClick={() => navigateTo('/register')}>
                {t('login.registerLink')}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
    </div>
  )
}
