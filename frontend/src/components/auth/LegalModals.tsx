import { useI18n, type DictKey } from '../../lib/i18n'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

export type LegalDoc = 'terms' | 'privacy' | 'accessibility' | 'sitemap'

const TERMS_KEYS: DictKey[] = [
  'terms.p1',
  'terms.p2',
  'terms.p3',
  'terms.p4',
  'terms.p5',
  'terms.p6',
  'terms.p7',
  'terms.p8',
  'terms.p9',
]

const PRIVACY_KEYS: DictKey[] = [
  'privacy.p1',
  'privacy.p2',
  'privacy.p3',
  'privacy.p4',
  'privacy.p5',
  'privacy.p6',
  'privacy.p7',
  'privacy.p8',
  'privacy.p9',
]

const ACCESSIBILITY_KEYS: DictKey[] = [
  'landing.footer.accessibilityP1',
  'landing.footer.accessibilityP2',
  'landing.footer.accessibilityP3',
  'landing.footer.accessibilityP4',
]

/**
 * Every legal document stays reachable from every other legal document. The
 * artwork on the sign-in page only has room for a few footer items, so the
 * ones that do not have their own printed link are offered here instead of
 * being left as dead ends.
 */
const LEGAL_DOCS: LegalDoc[] = ['terms', 'privacy', 'accessibility', 'sitemap']

const LEGAL_LABELS: Record<LegalDoc, DictKey> = {
  terms: 'terms.title',
  privacy: 'privacy.title',
  accessibility: 'landing.footer.accessibilityTitle',
  sitemap: 'landing.footer.sitemapTitle',
}

function LegalBody({ keys }: { keys: DictKey[] }) {
  const { t } = useI18n()
  return (
    <div className="space-y-3 text-sm leading-relaxed text-ink-700">
      {keys.map((key) => (
        <p key={key}>{t(key)}</p>
      ))}
    </div>
  )
}

function LegalFooter({
  active,
  onClose,
  onNavigate,
}: {
  active: LegalDoc
  onClose: () => void
  onNavigate?: (doc: LegalDoc) => void
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3">
      {onNavigate && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-ink-500">
            {t('landing.footer.legalLinks')}
          </span>
          {LEGAL_DOCS.filter((doc) => doc !== active).map((doc) => (
            <button
              key={doc}
              type="button"
              onClick={() => onNavigate(doc)}
              className="text-sm font-semibold text-ink-700 underline-offset-4 transition-colors hover:text-gold-700 hover:underline"
            >
              {t(LEGAL_LABELS[doc])}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <p className="text-xs text-ink-500">{t('landing.footer.copyright')}</p>
        <Button variant="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      </div>
    </div>
  )
}

function LegalModal({
  open,
  onClose,
  onNavigate,
  doc,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  onNavigate?: (doc: LegalDoc) => void
  doc: LegalDoc
  title: DictKey
  children: React.ReactNode
}) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t(title)}
      footer={<LegalFooter active={doc} onClose={onClose} onNavigate={onNavigate} />}
    >
      {children}
    </Modal>
  )
}

export function TermsModal({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate?: (doc: LegalDoc) => void
}) {
  return (
    <LegalModal
      open={open}
      onClose={onClose}
      onNavigate={onNavigate}
      doc="terms"
      title="terms.title"
    >
      <LegalBody keys={TERMS_KEYS} />
    </LegalModal>
  )
}

export function PrivacyModal({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate?: (doc: LegalDoc) => void
}) {
  return (
    <LegalModal
      open={open}
      onClose={onClose}
      onNavigate={onNavigate}
      doc="privacy"
      title="privacy.title"
    >
      <LegalBody keys={PRIVACY_KEYS} />
    </LegalModal>
  )
}

export function AccessibilityModal({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate?: (doc: LegalDoc) => void
}) {
  return (
    <LegalModal
      open={open}
      onClose={onClose}
      onNavigate={onNavigate}
      doc="accessibility"
      title="landing.footer.accessibilityTitle"
    >
      <LegalBody keys={ACCESSIBILITY_KEYS} />
    </LegalModal>
  )
}

/**
 * Sitemap of the routes that exist today. Signed-out visitors can only reach
 * the two public routes; everything else in the app requires an account, so it
 * is listed as a note instead of as dead links.
 */
export function SitemapModal({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean
  onClose: () => void
  onNavigate?: (doc: LegalDoc) => void
}) {
  const { t } = useI18n()
  return (
    <LegalModal
      open={open}
      onClose={onClose}
      onNavigate={onNavigate}
      doc="sitemap"
      title="landing.footer.sitemapTitle"
    >
      <div className="space-y-4 text-sm leading-relaxed text-ink-700">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-gold-700">
            {t('landing.footer.sitemapPublic')}
          </p>
          <ul className="space-y-1.5">
            <li>
              <a
                href="#/login"
                onClick={onClose}
                className={cn(
                  'font-semibold text-ink-900 underline underline-offset-4 hover:text-gold-700',
                )}
              >
                {t('auth.login')}
              </a>
            </li>
            <li>
              <a
                href="#/register"
                onClick={onClose}
                className={cn(
                  'font-semibold text-ink-900 underline underline-offset-4 hover:text-gold-700',
                )}
              >
                {t('auth.register')}
              </a>
            </li>
          </ul>
        </div>
        <p>{t('landing.footer.sitemapSignedIn')}</p>
      </div>
    </LegalModal>
  )
}