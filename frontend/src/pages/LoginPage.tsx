import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../lib/auth-context'
import { useI18n, type DictKey } from '../lib/i18n'
import { navigateTo } from '../lib/hash-route'
import { AuthBrand } from '../components/auth/AuthBrand'
import {
  LandingInfoModal,
  RecoveryModal,
  type InfoSection,
} from '../components/auth/LandingInfoDialogs'
import { LandingFooter } from '../components/layout/LandingFooter'
import { LandingNav, type LandingNavItem } from '../components/layout/LandingNav'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { Checkbox } from '../components/ui/Checkbox'
import { Input } from '../components/ui/Input'
import {
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
  FileTextIcon,
  HomeIcon,
  InfoIcon,
  LockIcon,
  MailIcon,
  MapPinIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
  VenusIcon,
} from '../components/ui/icons'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INDIAN_PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  return trimmed.replace(/^\+91[\s-]?\s*/, '').replace(/[\s-]/g, '')
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

/**
 * The navbar items are identified by their dictionary label, but their content
 * is keyed by InfoSection. This explicit map is what turns a clicked label into
 * the right document; deriving it from the scroll id would produce keys the
 * dialog does not know about.
 */
const NAV_INFO: Record<string, InfoSection> = {
  'landing.nav.home': 'home',
  'landing.nav.about': 'about',
  'landing.nav.services': 'services',
  'landing.nav.resources': 'resources',
  'landing.nav.help': 'help',
  'landing.nav.contact': 'contact',
}

export function LoginPage() {
  const { login, busy, error, clearError } = useAuth()
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [section, setSection] = useState<InfoSection | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const NAV_ITEMS: LandingNavItem[] = [
    { label: 'landing.nav.home', section: 'landing-home', icon: <HomeIcon /> },
    { label: 'landing.nav.about', section: 'landing-about', icon: <InfoIcon /> },
    { label: 'landing.nav.services', section: 'landing-services', icon: <ShieldCheckIcon /> },
    { label: 'landing.nav.resources', section: 'landing-resources', icon: <FileTextIcon /> },
    { label: 'landing.nav.help', section: 'landing-help', icon: <UsersIcon /> },
    { label: 'landing.nav.contact', section: 'landing-contact', icon: <MailIcon /> },
  ]

  const FEATURES: { title: DictKey; description: DictKey; icon: ReactNode }[] = [
    {
      title: 'landing.feature.womenSafety',
      description: 'landing.feature.womenSafetyDesc',
      icon: <VenusIcon />,
    },
    {
      title: 'landing.feature.disasterResponse',
      description: 'landing.feature.disasterResponseDesc',
      icon: <AlertTriangleIcon />,
    },
    {
      title: 'landing.feature.liveLocation',
      description: 'landing.feature.liveLocationDesc',
      icon: <MapPinIcon />,
    },
    {
      title: 'landing.feature.rescueTeams',
      description: 'landing.feature.rescueTeamsDesc',
      icon: <UsersIcon />,
    },
  ]

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
      const user = await login(normalizeIdentifier(identifier), password, remember)
      navigateTo(user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'RESPONDER' ? '/responder' : '/dashboard')
    } catch {
      /* error is surfaced through context */
    }
  }

  /** Only one message is ever shown, and only when something is actually wrong. */
  const fieldMessage = fieldErrors.identifier
    ? t(fieldErrors.identifier as DictKey)
    : fieldErrors.password
      ? t(fieldErrors.password as DictKey)
      : null
  const visibleError = error ?? fieldMessage

  function dismissError(): void {
    clearError()
    setFieldErrors({})
  }

  return (
    <div className="flex min-h-svh flex-col bg-cream-50 dark:bg-sky-950">
      <LandingNav
        items={NAV_ITEMS}
        onSelect={(item) => {
          const next = NAV_INFO[item.label]
          if (next) setSection(next)
        }}
      />

      <main className="flex-1">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-16">
          {/* ---------------------------------------------------- Hero copy */}
          <section id="landing-home" className="scroll-mt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-gold-700 dark:text-gold-300">
              <ShieldCheckIcon className="size-3.5" />
              {t('login.hero.badge')}
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-950 dark:text-white sm:text-5xl">
              {t('login.hero.titleA')}
              <br />
              <span className="text-gold-600 dark:text-gold-400">{t('login.hero.titleB')}</span>
            </h1>

            <p className="mt-4 text-lg font-semibold text-sky-700 dark:text-sky-300">
              {t('landing.hero.system')}
            </p>
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ink-600 dark:text-sky-200">
              {t('login.hero.subtitle')}
            </p>

            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <li
                  key={feature.title}
                  className="flex gap-3 rounded-2xl border border-ink-200/80 bg-white/70 p-4 shadow-sm transition-colors hover:border-gold-400 dark:border-sky-800 dark:bg-sky-900/50 dark:hover:border-gold-500/60"
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-500/15 text-gold-700 dark:bg-gold-500/20 dark:text-gold-300 [&>svg]:size-5"
                  >
                    {feature.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink-900 dark:text-white">
                      {t(feature.title)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-600 dark:text-sky-300">
                      {t(feature.description)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* --------------------------------------------------- Login card */}
          <section className="flex justify-center lg:justify-end">
            <Card className="w-full max-w-md shadow-xl shadow-ink-950/5">
              <CardBody className="space-y-5">
                <div className="flex flex-col items-center text-center">
                  <AuthBrand size="sm" />
                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-950 dark:text-white">
                    {t('landing.login.welcome')}
                  </h2>
                  <p className="mt-1 text-sm text-ink-600 dark:text-sky-300">
                    {t('landing.login.subtitle')}
                  </p>
                </div>

                {visibleError && (
                  <Alert variant="danger" title={t('login.errorTitle')} onClose={dismissError}>
                    {visibleError}
                  </Alert>
                )}

                <form className="space-y-4" noValidate onSubmit={(e: FormEvent) => void onSubmit(e)}>
                  <Input
                    label={t('landing.login.identifier')}
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder={t('login.emailPhonePlaceholder')}
                    leftIcon={<UserIcon />}
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
                    leftIcon={<LockIcon />}
                    requiredMark
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={fieldErrors.password ? t(fieldErrors.password as DictKey) : undefined}
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        aria-pressed={showPassword}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    }
                  />

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Checkbox
                      id="remember-me"
                      name="remember"
                      label={t('login.rememberMe')}
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    <button
                      type="button"
                      onClick={() => setForgotOpen(true)}
                      className="cursor-pointer rounded-lg text-sm font-semibold text-gold-700 underline-offset-4 transition-colors hover:text-gold-800 hover:underline dark:text-gold-400 dark:hover:text-gold-300"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>

                  <Button type="submit" fullWidth size="lg" loading={busy} disabled={busy}>
                    {busy ? t('login.submitting') : t('login.submit')}
                  </Button>

                  {/* OR divider */}
                  <div className="flex items-center gap-3" role="separator">
                    <span aria-hidden="true" className="h-px flex-1 bg-ink-200 dark:bg-sky-800" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-400 dark:text-sky-400">
                      {t('landing.login.or')}
                    </span>
                    <span aria-hidden="true" className="h-px flex-1 bg-ink-200 dark:bg-sky-800" />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    fullWidth
                    size="lg"
                    onClick={() => navigateTo('/register')}
                  >
                    {t('landing.login.register')}
                  </Button>
                  <p className="-mt-2 text-center text-xs text-ink-500 dark:text-sky-400">
                    {t('landing.login.registerHint')}
                  </p>
                </form>

                <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-3 text-xs leading-relaxed text-sky-800 dark:bg-sky-900/60 dark:text-sky-200">
                  <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
                  {t('landing.login.security')}
                </p>
              </CardBody>
            </Card>
          </section>
        </div>
      </main>

      <LandingFooter />

      {/* Every navbar entry opens its own document; each one cross-links to the
          others, so nothing in the navigation is a dead end. */}
      <LandingInfoModal section={section} onClose={() => setSection(null)} onNavigate={setSection} />

      {/* There is no reset endpoint and no email service in this deployment, so
          this dialog never claims a link was sent. It validates the identifier
          and then lists the recovery routes that genuinely exist. */}
      <RecoveryModal open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </div>
  )
}