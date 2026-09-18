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
  // Remove +91, spaces, hyphens
  let normalized = trimmed.replace(/^\+91[\s-]?/, '').replace(/[\s-]/g, '')
  return normalized
}

function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) return 'validation.required'
  if (trimmed.length < 2) return 'validation.nameLength'
  if (trimmed.length > 100) return 'validation.maxLength'
  return null
}

function validateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed) return 'validation.required'
  if (!EMAIL_REGEX.test(trimmed)) return 'validation.email'
  return null
}

function validatePhone(phone: string): string | null {
  const trimmed = phone.trim()
  if (!trimmed) return 'validation.required'
  const normalized = normalizePhone(trimmed)
  if (!PHONE_REGEX.test(trimmed) || normalized.length !== 10) {
    return 'validation.phone'
  }
  return null
}

function validatePassword(password: string): string | null {
  if (!password) return 'validation.required'
  if (password.length < 8) return 'validation.passwordMin'
  return null
}

function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) return 'validation.required'
  if (password !== confirmPassword) return 'register.passwordMismatch'
  return null
}

export function RegisterPage() {
  const { register, busy, error, clearError } = useAuth()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    const nameError = validateName(name)
    if (nameError) errors.name = nameError
    const emailError = validateEmail(email)
    if (emailError) errors.email = emailError
    const phoneError = validatePhone(phone)
    if (phoneError) errors.phone = phoneError
    const passwordError = validatePassword(password)
    if (passwordError) errors.password = passwordError
    const confirmError = validateConfirmPassword(password, confirmPassword)
    if (confirmError) errors.confirmPassword = confirmError
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!validateForm()) return
    try {
      const normalizedPhone = normalizePhone(phone)
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: normalizedPhone,
        password,
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
            title={t('register.title')}
            description={t('register.description')}
            onSubmit={(e: FormEvent) => void onSubmit(e)}
          >
            {error && (
              <Alert variant="danger" title={t('register.errorTitle')} onClose={clearError}>
                {error}
              </Alert>
            )}
            <Input
              label={t('register.name')}
              name="name"
              autoComplete="name"
              placeholder={t('register.namePlaceholder')}
              requiredMark
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={fieldErrors.name ? t(fieldErrors.name as DictKey) : undefined}
            />
            <Input
              label={t('register.email')}
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t('register.emailPlaceholder')}
              requiredMark
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors.email ? t(fieldErrors.email as DictKey) : undefined}
            />
            <Input
              label={t('register.phone')}
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder={t('register.phonePlaceholder')}
              requiredMark
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={fieldErrors.phone ? t(fieldErrors.phone as DictKey) : undefined}
            />
            <Input
              label={t('register.password')}
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t('register.passwordPlaceholder')}
              hint={t('register.passwordHint')}
              requiredMark
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password ? t(fieldErrors.password as DictKey) : undefined}
            />
            <Input
              label={t('register.confirmPassword')}
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t('register.confirmPasswordPlaceholder')}
              requiredMark
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword ? t(fieldErrors.confirmPassword as DictKey) : undefined}
            />
            <Button type="submit" fullWidth loading={busy} disabled={busy}>
              {busy ? t('register.submitting') : t('register.submit')}
            </Button>
            <p className="text-center text-sm text-ink-500">
              {t('register.loginLink')}
            </p>
          </Form>
        </CardBody>
      </Card>
    </div>
  )
}