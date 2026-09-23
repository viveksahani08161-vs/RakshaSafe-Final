import { useState, type FormEvent, type MouseEvent } from 'react'
import { useAuth } from '../lib/auth-context'
import { useI18n, type DictKey } from '../lib/i18n'
import { navigateTo } from '../lib/hash-route'
import { PrivacyModal, TermsModal } from '../components/auth/LegalModals'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Checkbox } from '../components/ui/Checkbox'
import { AuthBrand } from '../components/auth/AuthBrand'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { EyeIcon, EyeOffIcon, ShieldIcon } from '../components/ui/icons'

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

type LegalModalKind = 'terms' | 'privacy' | null

export function RegisterPage() {
  const { register, busy, error, clearError } = useAuth()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [legalModal, setLegalModal] = useState<LegalModalKind>(null)
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
    if (!termsAccepted) errors.terms = 'register.termsRequired'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (busy) return
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

  function openLegal(kind: Exclude<LegalModalKind, null>) {
    return (e: MouseEvent) => {
      // Keep the click from toggling the checkbox (button lives inside the label).
      e.preventDefault()
      e.stopPropagation()
      setLegalModal(kind)
    }
  }

  function passwordToggle(visible: boolean, onToggle: () => void) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-label={t(visible ? 'auth.hidePassword' : 'auth.showPassword')}
        aria-pressed={visible}
      >
        {visible ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <div className="w-fit rounded-2xl bg-white p-3 shadow-sm ring-1 ring-ink-900/5 dark:bg-white/95">
          <AuthBrand size="sm" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">{t('register.title')}</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{t('register.subtitle')}</p>
        </div>
      </div>
      <Card className="shadow-md shadow-ink-900/5">
        <CardBody>
          <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
            {error && (
              <Alert variant="danger" title={t('register.errorTitle')} onClose={clearError}>
                {error}
              </Alert>
            )}
            <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 dark:border-sky-800 dark:bg-sky-500/10">
              <ShieldIcon className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />
              <p className="text-xs font-medium text-sky-900 dark:text-sky-100">{t('auth.securityNote')}</p>
            </div>
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
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('register.passwordPlaceholder')}
              hint={t('register.passwordHint')}
              requiredMark
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password ? t(fieldErrors.password as DictKey) : undefined}
              rightElement={passwordToggle(showPassword, () => setShowPassword((v) => !v))}
            />
            <Input
              label={t('register.confirmPassword')}
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('register.confirmPasswordPlaceholder')}
              requiredMark
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors.confirmPassword ? t(fieldErrors.confirmPassword as DictKey) : undefined}
              rightElement={passwordToggle(showConfirmPassword, () => setShowConfirmPassword((v) => !v))}
            />
            <div>
              <Checkbox
                name="terms"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked)
                  if (e.target.checked) {
                    setFieldErrors((prev) => {
                      const next = { ...prev }
                      delete next.terms
                      return next
                    })
                  }
                }}
                label={
                  <span>
                    {t('register.termsPrefix')}{' '}
                    <button type="button" onClick={openLegal('terms')} className="font-semibold text-gold-700 underline underline-offset-2 hover:text-gold-800 dark:text-gold-300 dark:hover:text-gold-200">
                      {t('register.termsLink')}
                    </button>{' '}
                    {t('register.termsAnd')}{' '}
                    <button type="button" onClick={openLegal('privacy')} className="font-semibold text-gold-700 underline underline-offset-2 hover:text-gold-800 dark:text-gold-300 dark:hover:text-gold-200">
                      {t('register.privacyLink')}
                    </button>
                    {t('register.termsSuffix')}
                  </span>
                }
              />
              {fieldErrors.terms && (
                <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
                  {t(fieldErrors.terms as DictKey)}
                </p>
              )}
            </div>
            <Button type="submit" fullWidth loading={busy} disabled={busy}>
              {busy ? t('register.submitting') : t('register.submit')}
            </Button>
            <div className="border-t border-ink-100 pt-4">
              <Button type="button" variant="outline" fullWidth onClick={() => navigateTo('/login')}>
                {t('register.loginLink')}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>
      <TermsModal open={legalModal === 'terms'} onClose={() => setLegalModal(null)} />
      <PrivacyModal open={legalModal === 'privacy'} onClose={() => setLegalModal(null)} />
    </div>
  )
}
