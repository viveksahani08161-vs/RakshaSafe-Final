import { useI18n, type DictKey } from '../../lib/i18n'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const TERMS_KEYS: DictKey[] = [
  'terms.p1',
  'terms.p2',
  'terms.p3',
  'terms.p4',
  'terms.p5',
  'terms.p6',
  'terms.p7',
]

const PRIVACY_KEYS: DictKey[] = [
  'privacy.p1',
  'privacy.p2',
  'privacy.p3',
  'privacy.p4',
  'privacy.p5',
  'privacy.p6',
]

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

export function TermsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('terms.title')}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <LegalBody keys={TERMS_KEYS} />
    </Modal>
  )
}

export function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('privacy.title')}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      <LegalBody keys={PRIVACY_KEYS} />
    </Modal>
  )
}
