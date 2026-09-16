import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { describeOutcome, requestDeviceLocation, type DeviceCoords, type LocationOutcome } from '../lib/geolocation'
import { formatDateTime, type UnsafeReport } from '../lib/unsafeReports'
import { useToast } from '../components/ui/toast-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { Textarea } from '../components/ui/Textarea'

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

export function UnsafeReportsPage() {
  const { notify } = useToast()
  const [reports, setReports] = useState<UnsafeReport[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [category, setCategory] = useState('')
  const [severity, setSeverity] = useState('')
  const [description, setDescription] = useState('')
  const [acquiring, setAcquiring] = useState(false)
  const [outcome, setOutcome] = useState<LocationOutcome | null>(null)
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
      setLoadError(err instanceof ApiError ? err.message : 'Could not load your reports.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

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
    try {
      setOutcome(await requestDeviceLocation())
    } finally {
      setAcquiring(false)
    }
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    setCreatedRef(null)
    try {
      // Location is mandatory: the schema requires locationId, so a report
      // without captured coordinates is rejected instead of guessed.
      const res = await api<{ report: UnsafeReport }>('/unsafe-reports', {
        method: 'POST',
        body: {
          category: category.trim(),
          severity: severity.trim(),
          description: description.trim(),
          ...(coords ? { location: coords } : {}),
        },
      })
      notify({ title: 'Report submitted', description: 'Administrators will review it.', variant: 'success' })
      setCreatedRef(res.report.id)
      setCategory('')
      setSeverity('')
      setDescription('')
      setOutcome(null)
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
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <Card>
        <CardHeader
          title="Report unsafe area"
          description="Flag a place you consider risky. Reports start unverified — administrators review them before they count as confirmed."
        />
        <CardBody>
          <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
            {createdRef && (
              <Alert variant="success" title="Report recorded" onClose={() => setCreatedRef(null)}>
                Reference {createdRef}. It appears in your list below.
              </Alert>
            )}
            {formError && (
              <Alert variant="danger" title="Could not submit report" onClose={() => setFormError(null)}>
                {formError}
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Category"
                placeholder="e.g. Poor lighting"
                requiredMark
                value={category}
                error={fieldErrors.category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <Input
                label="Severity"
                placeholder="e.g. High"
                requiredMark
                value={severity}
                error={fieldErrors.severity}
                onChange={(e) => setSeverity(e.target.value)}
              />
            </div>
            <Textarea
              label="Description"
              rows={3}
              placeholder="What makes this place unsafe?"
              requiredMark
              value={description}
              error={fieldErrors.description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="space-y-3 rounded-xl border border-ink-200/70 bg-cream-50 p-4">
              <p className="text-sm font-bold text-ink-900">
                Location <span className="ml-0.5 text-rose-500">*</span>
              </p>
              {!outcome && !acquiring && (
                <Button variant="outline" onClick={() => void acquireLocation()}>
                  Capture device location
                </Button>
              )}
              {acquiring && (
                <span className="flex items-center gap-2 text-sm text-ink-500">
                  <Spinner size="sm" /> Requesting device location…
                </span>
              )}
              {outcome && !acquiring && (
                <Alert variant={outcome.state === 'available' ? 'success' : 'warning'} title={describeOutcome(outcome)}>
                  {outcome.state === 'available' && (
                    <span>
                      {outcome.coords.latitude.toFixed(6)}, {outcome.coords.longitude.toFixed(6)}
                      {outcome.coords.accuracy !== undefined && ` (±${Math.round(outcome.coords.accuracy)} m)`}
                    </span>
                  )}
                </Alert>
              )}
              {outcome && !acquiring && outcome.state !== 'available' && (
                <Button variant="outline" onClick={() => void acquireLocation()}>
                  Retry location
                </Button>
              )}
              {(fieldErrors.location ?? fieldErrors['location.latitude'] ?? fieldErrors['location.longitude']) && (
                <p className="text-xs font-medium text-rose-600" role="alert">
                  {fieldErrors.location ?? fieldErrors['location.latitude'] ?? fieldErrors['location.longitude']}
                </p>
              )}
              <p className="text-xs text-ink-400">
                A report cannot be submitted without captured coordinates — no false location is ever assumed.
              </p>
            </div>
            <Button type="submit" loading={submitting} disabled={submitting || acquiring}>
              Submit report
            </Button>
          </Form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="My reports" description="Your submissions with their review state." />
        <CardBody>
          {loading && <Skeleton lines={3} />}
          {!loading && loadError && (
            <ErrorState title="Could not load reports" description={loadError} onRetry={() => void load()} />
          )}
          {!loading && !loadError && reports.length === 0 && (
            <EmptyState title="No reports yet" description="Your unsafe-area reports will appear here after submission." />
          )}
          {!loading && !loadError && reports.length > 0 && (
            <ul className="space-y-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink-900">{r.category}</span>
                    <Badge variant="outline">{r.severity}</Badge>
                    <Badge variant={r.isVerified ? 'success' : 'warning'} dot>
                      {r.isVerified ? 'Verified' : 'Pending review'}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{r.description}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {r.location
                      ? `${r.location.latitude.toFixed(4)}, ${r.location.longitude.toFixed(4)}`
                      : 'No location'}{' '}
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
