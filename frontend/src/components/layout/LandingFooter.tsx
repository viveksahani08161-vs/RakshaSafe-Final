import { useState } from 'react'
import { useI18n } from '../../lib/i18n'
import { AccessibilityModal, PrivacyModal, SitemapModal, TermsModal } from '../auth/LegalModals'
import { AuthBrand } from '../auth/AuthBrand'

type LegalModalKind = 'terms' | 'privacy' | 'accessibility' | 'sitemap' | null

const LEGAL_LINKS: {
  key: LegalModalKind
  label: 'terms.title' | 'privacy.title' | 'landing.footer.accessibility' | 'landing.footer.sitemap'
}[] = [
  { key: 'terms', label: 'terms.title' },
  { key: 'privacy', label: 'privacy.title' },
  { key: 'accessibility', label: 'landing.footer.accessibility' },
  { key: 'sitemap', label: 'landing.footer.sitemap' },
]

/**
 * Slim dark-navy footer for the landing screen. Deliberately a single compact
 * bar so it stays a footer and never competes with the hero. The four legal
 * links open the existing Terms and Privacy dialogs plus two new read-only
 * dialogs, so no route or page had to be invented for them.
 */
export function LandingFooter() {
  const { t } = useI18n()
  const [legalModal, setLegalModal] = useState<LegalModalKind>(null)

  return (
    <footer
      id="site-footer"
      className="relative scroll-mt-28 overflow-hidden bg-sky-950 text-sky-100"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/60 to-transparent"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-4 sm:px-6 md:flex-row md:justify-between md:gap-6">
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 rounded-md bg-white/95 p-1 [&_img]:h-6 [&_img]:max-w-[4.5rem]">
            <AuthBrand size="sm" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-extrabold leading-tight tracking-tight text-white">
              Raksha<span className="text-gold-400">Safe</span>
            </span>
            <span className="block truncate text-[10px] font-semibold uppercase leading-tight tracking-[0.14em] text-sky-300">
              {t('landing.brand.subtitle')}
            </span>
          </span>
        </div>

        {/* Legal links */}
        <nav aria-label={t('landing.footer.legal')}>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {LEGAL_LINKS.map((link) => (
              <li key={link.key}>
                <button
                  type="button"
                  onClick={() => setLegalModal(link.key)}
                  className="cursor-pointer rounded text-xs font-semibold text-sky-200 underline-offset-4 transition-colors hover:text-gold-300 hover:underline"
                >
                  {t(link.label)}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Copyright */}
        <p className="shrink-0 text-center text-[11px] text-sky-300/80 md:text-right">
          {t('landing.footer.copyright')}
        </p>
      </div>

      <TermsModal open={legalModal === 'terms'} onClose={() => setLegalModal(null)} />
      <PrivacyModal open={legalModal === 'privacy'} onClose={() => setLegalModal(null)} />
      <AccessibilityModal open={legalModal === 'accessibility'} onClose={() => setLegalModal(null)} />
      <SitemapModal open={legalModal === 'sitemap'} onClose={() => setLegalModal(null)} />
    </footer>
  )
}
