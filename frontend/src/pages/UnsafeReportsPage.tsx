import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import {
  describeOutcome,
  requestDeviceLocation,
  reverseGeocode,
  type DeviceCoords,
  type LocationOutcome,
} from '../lib/geolocation'
import { formatDateTime, type UnsafeReport, UNSAFE_REPORT_CATEGORIES, UNSAFE_REPORT_SEVERITIES } from '../lib/unsafeReports'
import { useToast } from '../components/ui/toast-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Form } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { Textarea } from '../components/ui/Textarea'
import { useI18n } from '../lib/i18n'
import { MapPinIcon } from '../components/ui/icons'

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

function SeverityBadge({ severity }: { severity: string }) {
  const { t } = useI18n()
  const normalizedSeverity = severity.trim().toLowerCase()
  const severityLabels: Record<string, string> = {
    low: t('unsafeReports.severity.low'),
    medium: t('unsafeReports.severity.medium'),
    high: t('unsafeReports.severity.high'),
    critical: t('unsafeReports.severity.critical'),
  }
  const variants: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'> = {
    low: 'secondary',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  }
  const variant = variants[normalizedSeverity] ?? 'outline'
  return <Badge variant={variant}>{severityLabels[normalizedSeverity] ?? severity}</Badge>
}

function StatusBadge({ isVerified }: { isVerified: boolean }) {
  const { t } = useI18n()
  return (
    <Badge variant={isVerified ? 'success' : 'warning'} dot>
      {isVerified ? t('unsafeReports.report.verified') : t('unsafeReports.report.pending')}
    </Badge>
  )
}

function displayCategory(category: string, categoryLabels: Map<string, string>): string {
  return categoryLabels.get(category) ?? category
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

  const categoryOptions = UNSAFE_REPORT_CATEGORIES.map((c) => ({ label: t(c.labelKey), value: c.value }))
  const severityOptions = UNSAFE_REPORT_SEVERITIES.map((s) => ({ label: t(s.labelKey), value: s.value }))
  const categoryLabels = new Map<string, string>(UNSAFE_REPORT_CATEGORIES.map((item) => [item.value, t(item.labelKey)]))
  const [editing, setEditing] = useState<UnsafeReport | null>(null)
  const [deleting, setDeleting] = useState<UnsafeReport | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [editSeverity, setEditSeverity] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editOutcome, setEditOutcome] = useState<LocationOutcome | null>(null)
  const [editAreaName, setEditAreaName] = useState<string | null>(null)
  const [editAcquiring, setEditAcquiring] = useState(false)
  const [editGeocoding, setEditGeocoding] = useState(false)
  const [editLocationReplaced, setEditLocationReplaced] = useState(false)
  const [editFieldErrors, setEditFieldErrors] = useState<FieldErrors>({})
  const [editFormError, setEditFormError] = useState<string | null>(null)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const editCategoryOptions = categoryOptions.some((option) => option.value === editCategory)
    ? categoryOptions
    : [...categoryOptions, { label: displayCategory(editCategory, categoryLabels), value: editCategory }]
  const editSeverityOptions = severityOptions.some((option) => option.value === editSeverity)
    ? severityOptions
    : [...severityOptions, { label: editSeverity, value: editSeverity }]
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [createdRef, setCreatedRef] = useState<string | null>(null)

  const coords: DeviceCoords | null = outcome?.state === 'available' ? outcome.coords : null
  const descriptionLength = description.trim().length
  const MAX_DESCRIPTION_LENGTH = 2000

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

  function openEdit(report: UnsafeReport): void {
    setEditing(report)
    setEditCategory(report.category)
    setEditSeverity(report.severity.trim().toLowerCase())
    setEditDescription(report.description)
    setEditOutcome(null)
    setEditAreaName(null)
    setEditLocationReplaced(false)
    setEditFieldErrors({})
    setEditFormError(null)
  }

  function closeEdit(): void {
    if (!editSaving) setEditing(null)
  }

  async function acquireEditLocation(): Promise<void> {
    setEditAcquiring(true)
    setEditAreaName(null)
    try {
      const result = await requestDeviceLocation()
      setEditOutcome(result)
      setEditAcquiring(false)
      if (result.state === 'available') {
        setEditGeocoding(true)
        setEditAreaName(await reverseGeocode(result.coords.latitude, result.coords.longitude))
        setEditLocationReplaced(true)
      }
    } finally {
      setEditAcquiring(false)
      setEditGeocoding(false)
    }
  }

  function resetEditLocation(): void {
    setEditOutcome(null)
    setEditAreaName(null)
    setEditLocationReplaced(false)
  }

  async function onEditSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!editing || editSaving) return
    const reportId = editing.id
    const errors: FieldErrors = {}
    if (!editCategory) errors.category = t('unsafeReports.validation.categoryRequired')
    if (!editSeverity) errors.severity = t('unsafeReports.validation.severityRequired')
    if (!editDescription.trim()) errors.description = t('unsafeReports.validation.descriptionRequired')

    if (Object.keys(errors).length > 0) {
      setEditFieldErrors(errors)
      return
    }

    setEditSaving(true)
    setEditFieldErrors({})
    setEditFormError(null)
    try {
      const replacementCoords =
        editLocationReplaced && editOutcome?.state === 'available' ? editOutcome.coords : null
      await api<{ report: UnsafeReport }>(`/unsafe-reports/${reportId}`, {
        method: 'PATCH',
        body: {
          category: editCategory,
          severity: editSeverity,
          description: editDescription.trim(),
          ...(replacementCoords ? { location: replacementCoords } : {}),
        },
      })
      notify({ title: t('unsafeReports.updateSuccess'), variant: 'success' })
      setEditing(null)
      await load()
    } catch (err) {
      if (err instanceof ApiError) {
        const fields = toFieldErrors(err.details)
        if (Object.keys(fields).length > 0) {
          setEditFieldErrors(fields)
        } else {
          setEditFormError(err.message)
        }
      } else {
        setEditFormError(t('unsafeReports.updateError'))
      }
    } finally {
      setEditSaving(false)
    }
  }

  async function onDeleteConfirm(): Promise<void> {
    if (!deleting || deleteSaving) return
    const reportId = deleting.id
    setDeleteSaving(true)
    try {
      await api(`/unsafe-reports/${reportId}`, { method: 'DELETE' })
      notify({ title: t('unsafeReports.deleteSuccess'), variant: 'success' })
      setDeleting(null)
      await load()
    } catch (err) {
      notify({
        title: t('unsafeReports.deleteError'),
        description: err instanceof ApiError ? err.message : t('common.tryAgain'),
        variant: 'danger',
      })
    } finally {
      setDeleteSaving(false)
    }
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
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      errors.description = t('unsafeReports.form.descriptionTooLong')
    }
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
      <Card id="report-form">
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

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-ink-700">{t('unsafeReports.form.category')}</label>
                <Select
                  placeholder={t('unsafeReports.form.categoryPlaceholder')}
                  requiredMark
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  options={categoryOptions}
                  error={fieldErrors.category}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-ink-700">{t('unsafeReports.form.severity')}</label>
                <Select
                  placeholder={t('unsafeReports.form.severityPlaceholder')}
                  requiredMark
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  options={severityOptions}
                  error={fieldErrors.severity}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-ink-700">{t('unsafeReports.form.description')}</label>
                <Textarea
                  rows={4}
                  placeholder={t('unsafeReports.form.descriptionPlaceholder')}
                  requiredMark
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  error={fieldErrors.description}
                  maxLength={MAX_DESCRIPTION_LENGTH}
                />
                <p className={`text-xs text-right ${descriptionLength > MAX_DESCRIPTION_LENGTH ? 'text-rose-600 dark:text-rose-400' : 'text-ink-400'}`}>
                  {t('unsafeReports.form.descriptionHint', { count: descriptionLength, max: MAX_DESCRIPTION_LENGTH })}
                </p>
              </div>

              <div className="space-y-3 rounded-xl border border-ink-200/70 bg-cream-50 p-4">
                <p className="text-sm font-bold text-ink-900">{t('unsafeReports.location.required')}</p>

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
                      {t('unsafeReports.location.retry')} / Clear
                    </Button>
                  </div>
                )}

                {fieldErrors.location && (
                  <p className="text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
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
        <CardHeader title={t('unsafeReports.yourReports')} description={t('unsafeReports.yourReportsDescription')} />
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
                  {t('unsafeReports.myReports.emptyAction')}
                </Button>
              }
            />
          )}
          {!loading && !loadError && reports.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2" role="list">
              {reports.map((r) => {
                const locationText = r.location
                  ? [r.location.address, r.location.city, r.location.state, r.location.country]
                      .filter(Boolean)
                      .join(', ')
                  : null
                return (
                  <li
                    key={r.id}
                    className="flex flex-col gap-4 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm shadow-ink-900/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-ink-900">
                          {displayCategory(r.category, categoryLabels)}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <SeverityBadge severity={r.severity} />
                          <StatusBadge isVerified={r.isVerified} />
                        </div>
                      </div>
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700 dark:bg-gold-500/15 dark:text-gold-300">
                        <MapPinIcon className="size-5" />
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-ink-700">{r.description}</p>
                    <dl className="grid gap-2 text-xs text-ink-500 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <dt className="font-semibold uppercase tracking-wider text-ink-400">{t('unsafeReports.locationLabel')}</dt>
                        <dd className="mt-0.5 text-sm normal-case tracking-normal text-ink-700">
                          {r.location ? (
                            <>
                              <span className="font-medium">{locationText || t('unsafeReports.locationUnavailable')}</span>
                              <span className="block font-mono">
                                {r.location.latitude.toFixed(4)}, {r.location.longitude.toFixed(4)}
                                {r.location.accuracy !== undefined ? ` (±${Math.round(r.location.accuracy)} m)` : ''}
                              </span>
                            </>
                          ) : (
                            t('unsafeReports.locationUnavailable')
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-ink-400">{t('unsafeReports.submittedAt')}</dt>
                        <dd className="mt-0.5 text-sm normal-case tracking-normal text-ink-700">
                          {formatDateTime(r.createdAt)}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-ink-400">{t('unsafeReports.updatedAt')}</dt>
                        <dd className="mt-0.5 text-sm normal-case tracking-normal text-ink-700">
                          {formatDateTime(r.updatedAt)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-ink-100 pt-3">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        {t('unsafeReports.edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(r)}>
                        {t('unsafeReports.delete')}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal open={editing !== null} onClose={closeEdit} title={t('unsafeReports.editTitle')} description={t('unsafeReports.editDescription')}>
        <Form onSubmit={(event: FormEvent) => void onEditSubmit(event)}>
          {editFormError && (
            <Alert variant="danger" title={t('unsafeReports.updateError')} onClose={() => setEditFormError(null)}>
              {editFormError}
            </Alert>
          )}
          <Select
            label={t('unsafeReports.form.category')}
            placeholder={t('unsafeReports.form.categoryPlaceholder')}
            requiredMark
            value={editCategory}
            onChange={(event) => setEditCategory(event.target.value)}
            options={editCategoryOptions}
            error={editFieldErrors.category}
          />
          <Select
            label={t('unsafeReports.form.severity')}
            placeholder={t('unsafeReports.form.severityPlaceholder')}
            requiredMark
            value={editSeverity}
            onChange={(event) => setEditSeverity(event.target.value)}
            options={editSeverityOptions}
            error={editFieldErrors.severity}
          />
          <Textarea
            label={t('unsafeReports.form.description')}
            rows={4}
            placeholder={t('unsafeReports.form.descriptionPlaceholder')}
            requiredMark
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            error={editFieldErrors.description}
          />
          <div className="space-y-3 rounded-xl border border-ink-200/70 bg-cream-50 p-4">
            <p className="text-sm font-bold text-ink-900">{t('unsafeReports.locationLabel')}</p>
            {editing?.location && !editLocationReplaced && (
              <p className="text-sm text-ink-700">
                {editing.location.latitude.toFixed(4)}, {editing.location.longitude.toFixed(4)}
                {editing.location.accuracy !== undefined ? ` (±${Math.round(editing.location.accuracy)} m)` : ''}
              </p>
            )}
            {!editOutcome && !editAcquiring && (
              <Button variant="outline" onClick={() => void acquireEditLocation()}>
                {editing?.location ? t('unsafeReports.location.retry') : t('unsafeReports.location.capture')}
              </Button>
            )}
            {editAcquiring && (
              <span className="flex items-center gap-2 text-sm text-ink-500">
                <Spinner size="sm" /> {t('unsafeReports.location.acquiring')}
              </span>
            )}
            {editOutcome && !editAcquiring && (
              <Alert variant={editOutcome.state === 'available' ? 'success' : 'warning'} title={describeOutcome(editOutcome)}>
                {editOutcome.state === 'available' && (
                  <span>
                    {editOutcome.coords.latitude.toFixed(6)}, {editOutcome.coords.longitude.toFixed(6)}
                    {editOutcome.coords.accuracy !== undefined && ` (±${Math.round(editOutcome.coords.accuracy)} m)`}
                    {editGeocoding && (
                      <span className="mt-1 flex items-center gap-2">
                        <Spinner size="sm" /> {t('unsafeReports.location.acquiring')}
                      </span>
                    )}
                    {editAreaName && <span className="mt-1 block">{t('unsafeReports.location.area', { area: editAreaName })}</span>}
                  </span>
                )}
              </Alert>
            )}
            {editOutcome?.state === 'available' && (
              <Button variant="ghost" size="sm" onClick={resetEditLocation}>
                {t('unsafeReports.locationKeepExisting')}
              </Button>
            )}
            {editOutcome && editOutcome.state !== 'available' && (
              <Button variant="outline" onClick={() => void acquireEditLocation()}>
                {t('unsafeReports.location.retry')}
              </Button>
            )}
            <p className="text-xs text-ink-400">{t('unsafeReports.editDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={editSaving} disabled={editSaving || editAcquiring}>
              {t('common.save')}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={editSaving}>
              {t('common.cancel')}
            </Button>
          </div>
        </Form>
      </Modal>

      <Dialog
        open={deleting !== null}
        onClose={() => {
          if (!deleteSaving) setDeleting(null)
        }}
        variant="danger"
        title={t('unsafeReports.deleteTitle')}
        confirmLabel={t('unsafeReports.confirmDelete')}
        cancelLabel={t('common.cancel')}
        confirmLoading={deleteSaving}
        onConfirm={() => void onDeleteConfirm()}
      >
        {t('unsafeReports.deleteDescription')}{' '}
        {deleting && (
          <span>
            {displayCategory(deleting.category, categoryLabels)} · {formatDateTime(deleting.createdAt)}
          </span>
        )}
      </Dialog>
    </div>
  )
}