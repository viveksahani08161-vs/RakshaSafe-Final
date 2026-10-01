import { useState, type FormEvent } from 'react'
import { useI18n, type DictKey } from '../../lib/i18n'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INDIAN_PHONE_REGEX = /^(\+91[\s-]?)?[6-9]\d{9}$/

function normalizePhone(phone: string): string {
  return phone.trim().replace(/^\+91[\s-]?/, '').replace(/[\s-]/g, '')
}

export type InfoSection = 'home' | 'about' | 'services' | 'resources' | 'help' | 'contact'

type Block = { title: DictKey; body: DictKey }

const INFO_SECTIONS: Record<InfoSection, { title: DictKey; blocks: Block[] }> = {
  home: {
    title: 'landing.info.home.title',
    blocks: [
      { title: 'landing.info.home.safety.title', body: 'landing.info.home.safety.desc' },
      { title: 'landing.info.home.disaster.title', body: 'landing.info.home.disaster.desc' },
      { title: 'landing.info.home.sos.title', body: 'landing.info.home.sos.desc' },
      { title: 'landing.info.home.location.title', body: 'landing.info.home.location.desc' },
      { title: 'landing.info.home.contacts.title', body: 'landing.info.home.contacts.desc' },
      { title: 'landing.info.home.resources.title', body: 'landing.info.home.resources.desc' },
      { title: 'landing.info.home.weather.title', body: 'landing.info.home.weather.desc' },
      { title: 'landing.info.home.accounts.title', body: 'landing.info.home.accounts.desc' },
    ],
  },
  about: {
    title: 'landing.info.about.title',
    blocks: [
      { title: 'landing.info.about.mission.title', body: 'landing.info.about.mission.desc' },
      { title: 'landing.info.about.how.title', body: 'landing.info.about.how.desc' },
      { title: 'landing.info.about.scope.title', body: 'landing.info.about.scope.desc' },
      { title: 'landing.info.about.not.title', body: 'landing.info.about.not.desc' },
      { title: 'landing.info.about.stack.title', body: 'landing.info.about.stack.desc' },
    ],
  },
  services: {
    title: 'landing.info.services.title',
    blocks: [
      { title: 'landing.info.services.sos.title', body: 'landing.info.services.sos.desc' },
      { title: 'landing.info.services.responder.title', body: 'landing.info.services.responder.desc' },
      { title: 'landing.info.services.admin.title', body: 'landing.info.services.admin.desc' },
      { title: 'landing.info.services.location.title', body: 'landing.info.services.location.desc' },
      { title: 'landing.info.services.contacts.title', body: 'landing.info.services.contacts.desc' },
      { title: 'landing.info.services.nearby.title', body: 'landing.info.services.nearby.desc' },
      { title: 'landing.info.services.reports.title', body: 'landing.info.services.reports.desc' },
      { title: 'landing.info.services.notifications.title', body: 'landing.info.services.notifications.desc' },
    ],
  },
  resources: {
    title: 'landing.info.resources.title',
    blocks: [
      { title: 'landing.info.resources.help.title', body: 'landing.info.resources.help.desc' },
      { title: 'landing.info.resources.faq.title', body: 'landing.info.resources.faq.desc' },
      { title: 'landing.info.resources.facilities.title', body: 'landing.info.resources.facilities.desc' },
      { title: 'landing.info.resources.safety.title', body: 'landing.info.resources.safety.desc' },
    ],
  },
  help: {
    title: 'landing.info.help.title',
    blocks: [
      { title: 'landing.info.help.signin.title', body: 'landing.info.help.signin.desc' },
      { title: 'landing.info.help.password.title', body: 'landing.info.help.password.desc' },
      { title: 'landing.info.help.sos.title', body: 'landing.info.help.sos.desc' },
      { title: 'landing.info.help.location.title', body: 'landing.info.help.location.desc' },
      { title: 'landing.info.help.safety.title', body: 'landing.info.help.safety.desc' },
      { title: 'landing.info.help.contact.title', body: 'landing.info.help.contact.desc' },
    ],
  },
  contact: {
    title: 'landing.info.contact.title',
    blocks: [
      { title: 'landing.info.contact.emergency.title', body: 'landing.info.contact.emergency.desc' },
      { title: 'landing.info.contact.account.title', body: 'landing.info.contact.account.desc' },
      { title: 'landing.info.contact.correction.title', body: 'landing.info.contact.correction.desc' },
    ],
  },
}

const INFO_LABELS: Record<InfoSection, DictKey> = {
  home: 'landing.nav.home',
  about: 'landing.nav.about',
  services: 'landing.nav.services',
  resources: 'landing.nav.resources',
  help: 'landing.nav.help',
  contact: 'landing.nav.contact',
}

const INFO_SUBTITLES: Record<InfoSection, DictKey> = {
  home: 'landing.info.home.subtitle',
  about: 'landing.info.about.subtitle',
  services: 'landing.info.services.subtitle',
  resources: 'landing.info.resources.subtitle',
  help: 'landing.info.help.subtitle',
  contact: 'landing.info.contact.subtitle',
}

const INFO_INTROS: Record<InfoSection, DictKey> = {
  home: 'landing.info.home.intro',
  about: 'landing.info.about.intro',
  services: 'landing.info.services.intro',
  resources: 'landing.info.resources.intro',
  help: 'landing.info.help.intro',
  contact: 'landing.info.contact.intro',
}

/**
 * One dialog per navbar entry. Each document describes only what this
 * deployment actually does — there is no placeholder or unreleased content
 * here — and every entry stays reachable from every other entry.
 */
export function LandingInfoModal({
  section,
  onClose,
  onNavigate,
}: {
  section: InfoSection | null
  onClose: () => void
  onNavigate: (section: InfoSection) => void
}) {
  const { t } = useI18n()

  return (
    <Modal
      open={section !== null}
      onClose={onClose}
      size="lg"
      title={section ? t(INFO_LABELS[section]) : null}
      footer={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-ink-500">
              {t('landing.nav.label')}
            </span>
            {(Object.keys(INFO_LABELS) as InfoSection[])
              .filter((key) => key !== section)
              .map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onNavigate(key)}
                  className="text-sm font-semibold text-ink-700 underline-offset-4 transition-colors hover:text-gold-700 hover:underline"
                >
                  {t(INFO_LABELS[key])}
                </button>
              ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
            <p className="text-xs text-ink-500">{t('landing.footer.copyright')}</p>
            <Button variant="primary" onClick={onClose}>
              {t('common.close')}
            </Button>
          </div>
        </div>
      }
    >
      {section && (
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gold-700">
              {t(INFO_SUBTITLES[section])}
            </p>
            <h3 className="mt-1 text-lg font-extrabold tracking-tight text-ink-950">
              {t(INFO_SECTIONS[section].title)}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{t(INFO_INTROS[section])}</p>
          </div>
          <dl className="space-y-4 border-t border-ink-100 pt-4">
            {INFO_SECTIONS[section].blocks.map((block) => (
              <div key={block.title}>
                <dt className="text-sm font-bold text-ink-950">{t(block.title)}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-700">{t(block.body)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  )
}

/**
 * Account recovery. There is no password-reset endpoint and no email service in
 * this deployment, so this dialog never pretends a reset link was sent. It
 * validates what the user typed, then states plainly what is and is not
 * possible, and gives the recovery routes that genuinely exist.
 */
export function RecoveryModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const [identifier, setIdentifier] = useState('')
  const [invalid, setInvalid] = useState(false)
  const [checked, setChecked] = useState(false)

  function reset(): void {
    setIdentifier('')
    setInvalid(false)
    setChecked(false)
  }

  function close(): void {
    reset()
    onClose()
  }

  function onSubmit(e: FormEvent): void {
    e.preventDefault()
    const value = identifier.trim()
    const isEmail = EMAIL_REGEX.test(value)
    const isPhone = INDIAN_PHONE_REGEX.test(value) && normalizePhone(value).length === 10
    if (!isEmail && !isPhone) {
      setInvalid(true)
      setChecked(false)
      return
    }
    setInvalid(false)
    setChecked(true)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      title={t('login.recovery.title')}
      footer={
        <Button variant="primary" onClick={close}>
          {t('login.recovery.backToLogin')}
        </Button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-ink-700">{t('login.recovery.intro')}</p>

        {!checked ? (
          <form className="space-y-3" noValidate onSubmit={onSubmit}>
            <Input
              label={t('login.recovery.identifierLabel')}
              name="recovery-identifier"
              type="text"
              autoComplete="username"
              placeholder={t('login.recovery.identifierPlaceholder')}
              requiredMark
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value)
                if (invalid) setInvalid(false)
              }}
              error={invalid ? t('login.recovery.invalid') : undefined}
            />
            <Button type="submit" fullWidth>
              {t('login.recovery.check')}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <Alert variant="warning" title={t('login.recovery.noEmail')}>
              {t('login.recovery.note')}
            </Alert>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold-700">
                {t('login.recovery.stepsTitle')}
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-700">
                <li>{t('login.recovery.step1')}</li>
                <li>{t('login.recovery.step2')}</li>
                <li>{t('login.recovery.step3')}</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}