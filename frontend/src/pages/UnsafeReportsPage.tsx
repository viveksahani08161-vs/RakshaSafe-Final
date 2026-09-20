import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import {
  describeOutcome,
  requestDeviceLocation,
  reverseGeocode,
  type DeviceCoords,
  type LocationOutcome,
} from '../lib/geolocation'
import { formatDateTime, type UnsafeReport } from '../lib/unsafeReports'
import { useToast } from '../components/ui/toast-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Form } from '../components/ui/Form'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { Textarea } from '../components/ui/Textarea'
import { useI18n } from '../lib/i18n'

type FieldErrors = Record<string, string>

function toFieldErrors(details: unknown): FieldErrors {
  const out: FieldErrors = {}
  if (Array.isArray(details)) {
    for (const item of details) {
      if (
        typeof item === 'object' &&
        item !== null &&
        'field' in item &&
        'message' in item &&
        typeof (item as { field: unknown }).field === 'string' &&
        typeof (item as { message: unknown }).message === 'string'
      ) {
        out[(item as { field: string }).field] = (item as { message: string }).message
      }
    }
  }
  return out
}

const CATEGORIES = [
  { value: 'poorLighting', labelKey: 'unsafeReports.category.poorLighting' },
  { value: 'isolatedArea', labelKey: 'unsafeReports.category.isolatedArea' },
  { value: 'suspiciousActivity', labelKey: 'unsafeReports.category.suspiciousActivity' },
  { value: 'harassmentConcern', labelKey: 'unsafeReports.category.harassmentConcern' },
  { value: 'unsafeTransport', labelKey: 'unsafeReports.category.unsafeTransport' },
  { value: 'brokenCCTV', labelKey: 'unsafeReports.category.brokenCCTV' },
  { value: 'other', labelKey: 'unsafeReports.category.other' },
] as const

const SEVERITIES = [
  { value: 'low', labelKey: 'unsafeReports.severity.low' },
  { value: 'medium', labelKey: 'unsafeReports.severity.medium' },
  { value: 'high', labelKey: 'unsafeReports.severity.high' },
  { value: 'critical', labelKey: 'unsafeReports.severity.critical' },
] as const

function SeverityBadge({ severity }: { severity: string }) {
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    low: 'secondary',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  const variant = variants[severity] ?? 'outline'
  return <Badge variant={variant}>{severity}</Badge>
}

function StatusBadge({ isVerified }: { isVerified: boolean }) {
  return (
    <Badge variant={isVerified ? 'success' : 'warning'} dot>
      {isVerified ? 'Verified' : 'Pending Review'}
    </Badge>
  )
}

export function UnsafeReportsPage() {
  const { t } = useI18n()
  const { notify } = useToast()
  const [reports, setReports] = useState<UnsafeReport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [description, setDescription] = useState('')
  const [acquiring, setAcquiring] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [outcome, setOutcome] = useState<LocationOutcome | null>(null)
  const [areaName, setAreaName] = useState<string | null>(null)

  const categoryOptions = CATEGORIES.map((c) => ({ label: t(c.labelKey), value: c.value }))
  const severityOptions = SEVERITIES.map((s) => ({ label: t(s.labelKey), value: s.value }))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdRef, setCreatedRef] = useState<string | null>(null)

  const coords: DeviceCoords | null = outcome?.state === 'available' ? outcome.coords : null

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api<{ reports: UnsafeReport[] }>('/unsafe-reports', signal ? { signal } : {})
      setReports(res.reports)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError(err instanceof ApiError ? err.message : t('unsafeReports.myReports.errorTitle'))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    const controller = new AbortController()
    async function initialLoad(): Promise<void> {
      await load(controller.signal)
    }
    void initialLoad()
    return () => controller.abort()
  }, [load])

  async function acquireLocation(): Promise<void> {
    setAcquiring(true)
    setAreaName(null)
    try {
      const result = await requestDeviceLocation()
      setOutcome(result)
      if (result.state === 'available') {
        setGeocoding(true)
        const area = await reverseGeocode(result.coords.latitude, result.coords.longitude)
        setAreaName(area)
        setGeocoding(false)
      }
    } finally {
      setAcquiring(false)
    }
  }

  function resetLocation(): void {
    setOutcome(null)
    setAreaName(null)
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    setCreatedRef(null)

    const errors: FieldErrors = {}
    if (!category) errors.category = t('unsafeReports.validation.categoryRequired')
    if (!severity) errors.severity = t('unsafeReports.validation.severityRequired')
    if (!description.trim()) errors.description = t('unsafeReports.validation.descriptionRequired')
    if (!coords) errors.location = t('unsafeReports.validation.locationRequired')

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setSubmitting(false)
      return
    }

    try {
      const res = await api<{ report: UnsafeReport }>('/unsafe-reports', {
        method: 'POST',
        body: {
          category,
          severity,
          description: description.trim(),
          ...(coords ? { location: coords } : {}),
        },
      })
      notify({ title: t('unsafeReports.successTitle'), description: t('unsafeReports.successDescription'), variant: 'success' })
      setCreatedRef(res.report.id)
      setCategory('')
      setSeverity('')
      setDescription('')
      resetLocation()
      await load()
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (Object.keys(fields).length > 0) {
          setFieldErrors(fields)
        } else {
          setFormError(err.message)
        }
      } else {
        setFormError(t('unsafeReports.submitFailed'))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Card>
        <CardHeader
          title={t('unsafeReports.title')}
          description={t('unsafeReports.description')}
        />
        <CardBody>
          <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
            {createdRef && (
              <Alert variant="success" title={t('unsafeReports.submitted')} onClose={() => setCreatedRef(null)}>
                {t('unsafeReports.reference', { id: createdRef })}
              </Alert>
            )}
            {formError && (
              <Alert variant="danger" title={t('unsafeReports.submitFailed')} onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}

            <div className="space-y-4">
              <Select
                label={t('unsafeReports.form.category')}
                placeholder={t('unsafeReports.form.categoryPlaceholder')}
                requiredMark
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categoryOptions}
                error={fieldErrors.category}
              />

              <Select
                label={t('unsafeReports.form.severity')}
                placeholder={t('unsafeReports.form.severityPlaceholder')}
                requiredMark
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                options={severityOptions}
                error={fieldErrors.severity}
              />

              <Textarea
                label={t('unsafeReports.form.description')}
                rows={4}
                placeholder={t('unsafeReports.form.descriptionPlaceholder')}
                requiredMark
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={fieldErrors.description}
              />

              <div className="space-y-3 rounded-xl border border-ink-200/70 bg-cream-50 p-4">
                <p className="text-sm font-bold text-ink-900">
                  {t('unsafeReports.location.required')}
                </p>

                {!outcome && !acquiring && (
                  <Button variant="outline" onClick={() => void acquireLocation()}>
                    {t('unsafeReports.location.capture')}
                  </Button>
                )}

                {acquiring && (
                  <span className="flex items-center gap-2 text-sm text-ink-500">
                    <Spinner size="sm" /> {t('unsafeReports.location.acquiring')}
                  </span>
                )}

                {outcome && !acquiring && (
                  <div className="space-y-2">
                    <Alert variant={outcome.state === 'available' ? 'success' : 'warning'} title={describeOutcome(outcome)}>
                      {outcome.state === 'available' && (
                        <>
                          {geocoding && <span className="flex items-center gap-2"><Spinner size="sm" /> Resolving address…</span>}
                          {areaName && <p className="mt-1 text-sm text-ink-700">{t('unsafeReports.location.area', { area: areaName })}</p>}
                          {!geocoding && !areaName && outcome.state === 'available' && (
                            <p className="mt-1 text-sm text-ink-500">Location captured. Address could not be determined.</p>
                          )}
                          <p className="mt-1 text-xs text-ink-500">{t('unsafeReports.location.coordinatesSecured')}</p>
                        </>
                      )}
                    </Alert>
                    {outcome.state !== 'available' && (
                      <Button variant="outline" onClick={() => void acquireLocation()}>
                        {t('unsafeReports.location.retry')}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={resetLocation}>
                      {t('unsafeReports.location.retry')} / {t('common.cancel') ?? 'Clear'}
                    </Button>
                  </div>
                )}

                {fieldErrors.location && (
                  <p className="text-xs font-medium text-rose-600" role="alert">
                    {fieldErrors.location}
                  </p>
                )}

                <p className="text-xs text-ink-400">
                  {t('unsafeReports.location.noFalse')}
                </p>
              </div>

              <Button type="submit" loading={submitting} disabled={submitting || acquiring} className="w-full sm:w-auto">
                {submitting ? t('unsafeReports.submitting') : t('unsafeReports.submit')}
              </Button>
            </div>
          </Form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t('unsafeReports.myReports.title')} description={t('unsafeReports.myReports.description')} />
        <CardBody>
          {loading && <Skeleton lines={3} />}
          {!loading && loadError && (
            <ErrorState
              title={t('unsafeReports.myReports.errorTitle')}
              description={loadError}
              onRetry={() => void load()}
            />
          )}
          {!loading && !loadError && reports.length === 0 && (
            <EmptyState
              title={t('unsafeReports.myReports.emptyTitle')}
              description={t('unsafeReports.myReports.emptyDescription')}
              action={
                <Button size="sm" variant="primary" onClick={() => document.getElementById('report-form')?.scrollIntoView()}>
                  {t('unsafeReports.submit')}
                </Button>
              }
            />
          )}
          {!loading && !loadError && reports.length > 0 && (
            <ul className="space-y-3" role="list">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm shadow-ink-900/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink-900">{r.category}</span>
                    <SeverityBadge severity={r.severity} />
                    <StatusBadge isVerified={r.isVerified} />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600 line-clamp-2">{r.description}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {r.location
                      ? `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}`
                      : t('unsafeReports.report.noLocation')}{' '}
                    · {formatDateTime(r.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  )
}