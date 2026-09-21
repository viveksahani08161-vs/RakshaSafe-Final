import { useI18n, type DictKey } from '../../lib/i18n'
import { PhoneIcon } from '../ui/icons'
import { Card, CardBody, CardHeader } from '../ui/Card'

interface Helpline {
  nameKey: DictKey
  descriptionKey: DictKey
  number: string
  icon: React.ReactNode
}

const HELPLINES: Helpline[] = [
  { nameKey: 'dashboard.helpline.nationalEmergency.name', descriptionKey: 'dashboard.helpline.nationalEmergency.description', number: '112', icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg> },
  { nameKey: 'dashboard.helpline.police.name', descriptionKey: 'dashboard.helpline.police.description', number: '100', icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg> },
  { nameKey: 'dashboard.helpline.fire.name', descriptionKey: 'dashboard.helpline.fire.description', number: '101', icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6A5.917 5.917 0 0 1 11 20c-1.5 0-2.7-.5-4-1a2.5 2.5 0 0 1-1-2V2h10v2c0 .99-.4 1.7-1 2.5a2 2 0 0 1 1 2.5 2.5 2.5 0 0 1 1 2.5V20" /></svg> },
  { nameKey: 'dashboard.helpline.ambulance.name', descriptionKey: 'dashboard.helpline.ambulance.description', number: '108', icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14" /><path d="M4 10H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h16" /><path d="M10 4v4" /><path d="M10 4h2.5" /><path d="M10 8h2.5" /><path d="M14 8h2.5" /><path d="M14 4h2.5" /><path d="M18 8h2.5" /><path d="M22 8h2.5" /><path d="M22 4h2.5" /><path d="M18 4h2.5" /><path d="M10 12v8" /><path d="M14 12v8" /><path d="M18 12v8" /><path d="M22 12v8" /><path d="M8 10v8" /><path d="M12 10v8" /><path d="M16 10v8" /><path d="M20 10v8" /></svg> },
  { nameKey: 'dashboard.helpline.women.name', descriptionKey: 'dashboard.helpline.women.description', number: '181', icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="3" /><path d="M20 21c0-3.07-1.64-5.64-4.5-6.32V4a2 2 0 0 0-4 0v15.68C7.64 15.36 6 17.93 6 21" /></svg> },
  { nameKey: 'dashboard.helpline.child.name', descriptionKey: 'dashboard.helpline.child.description', number: '1098', icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8" /><path d="M12 2v4" /><path d="M12 18v4" /><path d="M4 12h4" /><path d="M16 12h4" /><path d="M15 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></svg> },
  { nameKey: 'dashboard.helpline.cyber.name', descriptionKey: 'dashboard.helpline.cyber.description', number: '1930', icon: <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg> },
]

export function EmergencyHelplines() {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader
        title={t('dashboard.helplines.title')}
        description={t('dashboard.helplines.subtitle')}
      />
      <CardBody className="pt-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" role="list" aria-label={t('dashboard.helplines.title')}>
          {HELPLINES.map((hl) => (
            <a
              key={hl.number}
              href={`tel:${hl.number}`}
              className="flex h-full flex-col gap-2 rounded-xl border border-ink-200/70 bg-white p-3.5 shadow-sm transition-colors hover:border-gold-300 hover:bg-cream-50 focus:outline-none focus:ring-2 focus:ring-gold-500"
              role="listitem"
              aria-label={`${t('dashboard.helplines.call')} ${t(hl.nameKey as DictKey)} ${hl.number}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                  {hl.icon}
                </span>
                <span className="shrink-0 rounded-md bg-rose-50 px-1.5 py-0.5 font-mono text-base font-extrabold leading-none text-rose-600">
                  {hl.number}
                </span>
              </div>
              <p className="truncate text-sm font-bold text-ink-900" title={t(hl.nameKey as DictKey)}>
                {t(hl.nameKey as DictKey)}
              </p>
              <p className="truncate text-[11px] text-ink-400" title={t(hl.descriptionKey as DictKey)}>
                {t(hl.descriptionKey as DictKey)}
              </p>
              <span className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700">
                <PhoneIcon className="size-4" />
                {t('dashboard.helplines.call')}
              </span>
            </a>
          ))}
        </div>
      </CardBody>
    </Card>
  )
}