import { useState, type FormEvent } from 'react'
import { useAuth } from '../lib/auth-context'
import { useI18n, type DictKey } from '../lib/i18n'
import { navigateTo } from '../lib/hash-route'
import { AuthBrand } from '../components/auth/AuthBrand'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { EyeIcon, EyeOffIcon, GoogleIcon, ShieldIcon } from '../components/ui/icons'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ''
  const normalized = trimmed.replace(/^\+91[\s-]?/, '').replace(/[\s-]/g, '')
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
    <div className="flex min-h-[calc(100svh-4rem)] w-full flex-col overflow-hidden lg:flex-row">
      {/* Left: large RakshaSafe hero section (desktop) */}
      <section className="relative hidden w-full items-center justify-center overflow-hidden bg-gradient-to-br from-sky-100 via-cream-50 to-gold-100 px-8 py-14 lg:flex lg:w-[55%] xl:w-[58%] dark:from-sky-950 dark:via-ink-900 dark:to-gold-950">
        <div className="pointer-events-none absolute -left-24 top-1/4 size-96 rounded-full bg-sky-300/30 blur-3xl dark:bg-sky-500/10" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 size-96 rounded-full bg-gold-300/30 blur-3xl dark:bg-gold-500/10" />

        <div className="relative flex w-full max-w-2xl flex-col items-center gap-10 text-center">
          <div className="w-full max-w-[36rem] rounded-3xl bg-white p-4 shadow-2xl shadow-ink-900/10 ring-1 ring-ink-900/10 sm:p-6 dark:ring-white/10">
            <AuthBrand size="hero" />
          </div>
          <div className="space-y-3">
            <p className="text-4xl font-extrabold tracking-tight text-ink-950 xl:text-5xl dark:text-white">
              Raksha<span className="text-gold-500 dark:text-gold-300">Safe</span>
            </p>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300 xl:text-sm">
              {t('login.hero.badge')}
            </p>
          </div>
        </div>
      </section>

      {/* Right: login panel */}
      <section className="flex w-full flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[500px]">
          {/* Compact brand header (mobile/tablet) */}
          <div className="mb-8 flex flex-col items-center gap-2 text-center lg:hidden">
            <AuthBrand size="md" />
            <div className="space-y-1">
              <p className="text-xl font-extrabold tracking-tight text-ink-950 dark:text-white">
                Raksha<span className="text-gold-500 dark:text-gold-300">Safe</span>
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-700 dark:text-sky-300">
                {t('login.hero.badge')}
              </p>
            </div>
          </div>

          <Card className="shadow-xl shadow-ink-900/10">
            <CardBody>
              <div className="mb-6 flex flex-col items-center gap-3 text-center">
                <div className="w-fit rounded-2xl bg-white p-2.5 shadow-sm ring-1 ring-ink-900/5 dark:bg-white/95 dark:ring-white/20">
                  <AuthBrand size="sm" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">{t('login.title')}</h2>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{t('login.subtitle')}</p>
                </div>
              </div>

              <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
                {error && (
                  <Alert variant="danger" title={t('login.errorTitle')} onClose={clearError}>
                    {error}
                  </Alert>
                )}
                <div>
                  <Button type="button" variant="outline" fullWidth disabled aria-disabled="true" title={t('login.googleNotConfigured')}>
                    <GoogleIcon className="size-5" />
                    {t('login.google')}
                  </Button>
                  <p className="mt-1.5 text-center text-xs text-ink-400 dark:text-ink-500">{t('login.googleNotConfigured')}</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-ink-400" aria-hidden="true">
                  <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
                  {t('login.or')}
                  <span className="h-px flex-1 bg-ink-200 dark:bg-white/10" />
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 dark:border-sky-800 dark:bg-sky-500/10">
                  <ShieldIcon className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />
                  <p className="text-xs font-medium text-sky-900 dark:text-sky-100">{t('auth.securityNote')}</p>
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
                <div className="border-t border-ink-100 pt-4 text-center dark:border-white/10">
                  <p className="mb-2 text-sm text-ink-500 dark:text-ink-300">{t('login.registerPrefix')}</p>
                  <Button type="button" variant="outline" fullWidth onClick={() => navigateTo('/register')}>
                    {t('login.registerLink')}
                  </Button>
                </div>
              </Form>
            </CardBody>
          </Card>
        </div>
      </section>
    </div>
  )
}