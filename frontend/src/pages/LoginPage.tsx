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
import { ShieldIcon, MapPinIcon, UsersIcon, BellIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '../components/ui/icons'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INDIAN_PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (!trimmed) return ''
  const normalized = trimmed.replace(/^\+91[\s-]?/, '').replace(/[\s-]/g, '')
  return normalized
}

/**
 * The backend accepts any non-empty identifier (email or phone) and returns
 * "Invalid credentials" for unknown accounts. Frontend validation must not
 * be stricter than that, otherwise real accounts (e.g. admin phones that
 * are not Indian-mobile-shaped) can never even submit the form.
 */
function validateIdentifier(identifier: string): string | null {
  if (!identifier.trim()) return 'validation.required'
  return null
}

/**
 * Mirror the backend lookup without corrupting the identifier: emails are
 * lowercased, Indian numbers are stripped to 10 digits (the registration
 * convention), and anything else is sent verbatim so the server can match
 * exactly what is stored.
 */
function normalizeIdentifier(identifier: string): string {
  const trimmed = identifier.trim()
  const lower = trimmed.toLowerCase()
  if (EMAIL_REGEX.test(lower)) return lower
  const normalized = normalizePhone(trimmed)
  if (INDIAN_PHONE_REGEX.test(trimmed) && normalized.length === 10) return normalized
  return trimmed
}

function validatePassword(password: string): string | null {
  if (!password) return 'validation.required'
  return null
}

interface FeatureItem {
  icon: React.ReactNode
  title: DictKey
  description: DictKey
}

const features: FeatureItem[] = [
  { icon: <ShieldIcon className="size-5" />, title: 'login.hero.f1t', description: 'login.hero.f1d' },
  { icon: <MapPinIcon className="size-5" />, title: 'login.hero.f2t', description: 'login.hero.f2d' },
  { icon: <UsersIcon className="size-5" />, title: 'login.hero.f3t', description: 'login.hero.f3d' },
  { icon: <BellIcon className="size-5" />, title: 'login.hero.f4t', description: 'login.hero.f4d' },
]

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
    if (busy) return
    if (!validateForm()) return
    try {
      const user = await login(normalizeIdentifier(identifier), password)
      navigateTo(user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'RESPONDER' ? '/responder' : '/dashboard')
    } catch {
      /* error is surfaced through context */
    }
  }

  return (
    <div className="min-h-svh w-full flex flex-col overflow-hidden bg-cream-50 dark:bg-ink-950">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-white/10 bg-cream-50/80 dark:bg-ink-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <AuthBrand size="md" />
        </div>
        <div className="flex items-center gap-2">
          <a href="#/register" className="text-sm font-medium text-ink-700 hover:text-gold-600 dark:text-ink-200 dark:hover:text-gold-400 transition-colors">
            {t('auth.register')}
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Hero/Branding Section */}
        <section className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-8 py-12 bg-gradient-to-br from-sky-50 via-cream-50 to-gold-50 dark:from-sky-950/30 dark:via-ink-900/50 dark:to-gold-950/30 overflow-hidden relative">
          {/* Decorative background blobs */}
          <div className="pointer-events-none absolute -top-20 -left-20 size-72 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/10" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 size-72 rounded-full bg-gold-300/20 blur-3xl dark:bg-gold-500/10" />

          <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-8 text-center">
            {/* Logo */}
            <div className="w-full max-w-[28rem] rounded-2xl bg-white/80 p-6 shadow-xl shadow-ink-900/5 ring-1 ring-ink-900/5 dark:bg-white/5 dark:ring-white/10 backdrop-blur-sm">
              <AuthBrand size="hero" />
            </div>

            {/* Title & Tagline */}
            <div className="space-y-3">
              <p className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-ink-950 dark:text-white">
                Raksha<span className="text-gold-500 dark:text-gold-300">Safe</span>
              </p>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-700 dark:text-sky-300">
                {t('login.hero.badge')}
              </p>
            </div>

            {/* Main Heading */}
            <div className="space-y-2 text-left max-w-xl">
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-ink-950 dark:text-white leading-tight">
                {t('login.hero.titleA')}
              </h1>
              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-ink-950 dark:text-white leading-tight">
                {t('login.hero.titleB')}
              </h1>
              <p className="text-lg text-ink-600 dark:text-ink-300 leading-relaxed">
                {t('login.hero.subtitle')}
              </p>
            </div>

            {/* Feature Cards */}
            <ul className="w-full space-y-3 pt-2" role="list" aria-label={t('login.hero.badge')}>
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-left group">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/70 text-sky-700 shadow-sm ring-1 ring-sky-200/60 dark:bg-white/10 dark:text-sky-300 dark:ring-white/10 transition-all group-hover:bg-gold-100 dark:group-hover:bg-gold-900/30 group-hover:ring-gold-300/50">
                    {feature.icon}
                  </span>
                  <span className="min-w-0 pt-1">
                    <span className="block text-sm font-semibold text-ink-900 dark:text-white">{t(feature.title)}</span>
                    <span className="block text-xs leading-relaxed text-ink-500 dark:text-ink-400">{t(feature.description)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: Login Form Section */}
        <section className="flex w-full lg:w-1/2 items-center justify-center px-4 py-10 sm:px-8 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Mobile/Tablet: Compact Brand Header */}
            <div className="mb-8 lg:hidden flex flex-col items-center gap-2 text-center">
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

            {/* Login Card */}
            <Card className="shadow-xl shadow-ink-900/10 ring-1 ring-ink-900/5 dark:ring-white/10">
              <CardBody className="p-6 sm:p-8">
                {/* Logo */}
                <div className="mb-6 flex justify-center">
                  <div className="w-fit rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-ink-900/5 dark:bg-white/95 dark:ring-white/20">
                    <AuthBrand size="sm" />
                  </div>
                </div>

                {/* Title & Subtitle */}
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">
                    {t('login.title')}
                  </h2>
                  <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
                    {t('login.subtitle')}
                  </p>
                </div>

                {/* Form */}
                <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
                  {error && (
                    <Alert variant="danger" title={t('login.errorTitle')} onClose={clearError} className="mb-4">
                      {error}
                    </Alert>
                  )}

                  {/* Email/Phone Field */}
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
                    leftIcon={<MailIcon className="size-4" />}
                  />

                  {/* Password Field */}
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
                    leftIcon={<LockIcon className="size-4" />}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                        aria-pressed={showPassword}
                        className="p-1 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 transition-colors"
                      >
                        {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </button>
                    }
                  />

                  {/* Submit Button */}
                  <Button type="submit" fullWidth loading={busy} disabled={busy} className="mt-2 h-11 text-base font-semibold">
                    {busy ? t('login.submitting') : t('login.submit')}
                  </Button>

                  {/* Register Link */}
                  <div className="mt-6 border-t border-ink-100 pt-4 text-center dark:border-white/10">
                    <p className="text-sm text-ink-500 dark:text-ink-400">
                      {t('login.registerPrefix')}{' '}
                      <Button type="button" variant="ghost" size="sm" className="p-0 h-auto text-gold-700 hover:text-gold-800 dark:text-gold-300 dark:hover:text-gold-200 font-semibold" onClick={() => navigateTo('/register')}>
                        {t('login.registerLink')}
                      </Button>
                    </p>
                  </div>
                </Form>
              </CardBody>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-ink-100 bg-cream-50 py-4 text-center text-xs text-ink-400 dark:border-white/10 dark:bg-ink-950">
        <p className="font-medium">RakshaSafe · Women Safety & Disaster Emergency Response</p>
        <p className="mt-0.5">Developed by Vivek & Vaibhav</p>
      </footer>
    </div>
  )
}