import { cn } from '../../lib/cn'
import { LANGS, useI18n } from '../../lib/i18n'

export function LanguageSelector() {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-ink-200 bg-white p-0.5 shadow-sm"
    >
      {LANGS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => setLang(value)}
          className={cn(
            'rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-colors',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500',
            lang === value
              ? 'bg-gold-500 text-white shadow-sm'
              : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}