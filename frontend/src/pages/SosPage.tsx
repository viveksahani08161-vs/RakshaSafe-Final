import { useState, type FormEvent, type ReactNode } from 'react'
import { ApiError, api } from '../lib/api'
import { describeOutcome, requestDeviceLocation, type DeviceCoords, type LocationOutcome } from '../lib/geolocation'
import { INCIDENT_CATEGORIES, formatDateTime, statusBadgeVariant, type Incident } from '../lib/incidents'
import { useToast } from '../components/ui/toast-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Select } from '../components/ui/Select'
import { SosButton } from '../components/ui/SosButton'
import { Spinner } from '../components/ui/Spinner'
import { Textarea } from '../components/ui/Textarea'

type Step = 'details' | 'location' | 'review' | 'done'
type FieldErrors = Record<string, string>

const STEPS: { id: Step; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'location', label: 'Location' },
  { id: 'review', label: 'Review' },
]

function Stepper({ current }: { current: Step }) {
  const order: Step[] = ['details', 'location', 'review']
  const currentIndex = current === 'done' ? order.length : order.indexOf(current)
  return (
    <ol className="flex items-center gap-2" aria-label="SOS progress">
      {STEPS.map((step, i) => (
        <li key={step.id} className="flex items-center gap-2">
          <span
            aria-current={order[i] === current ? 'step' : undefined}
            className={
              i < currentIndex
                ? 'flex size-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white'
                : i === currentIndex
                  ? 'flex size-7 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-white'
                  : 'flex size-7 items-center justify-center rounded-full bg-ink-200 text-xs font-bold text-ink-500'
            }
          >
            {i + 1}
          </span>
          <span className="hidden text-xs font-semibold text-ink-600 sm:inline">{step.label}</span>
          {i < STEPS.length - 1 && <span className="h-px w-6 bg-ink-200 sm:w-10" aria-hidden />}
        </li>
      ))}
    </ol>
  )
}

function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="text-sm text-ink-900">{children}</dd>
    </div>
  )
}

export function SosPage() {
  const { notify } = useToast()
  const [step, setStep] = useState<Step>('details')
  const [incidentType, setIncidentType] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [acquiring, setAcquiring] = useState(false)
  const [outcome, setOutcome] = useState<LocationOutcome | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [created, setCreated] = useState<Incident | null>(null)

  const coords: DeviceCoords | null =
    outcome?.state === 'available' && !skipped ? outcome.coords : null

  function validateDetails(): boolean {
    const errors: FieldErrors = {}
    if (incidentType !== 'Safety' && incidentType !== 'Disaster') {
      errors.type = 'Select Safety or Disaster.'
    }
    if (category.trim().length < 2) {
      errors.category = 'Select a category.'
    }
    if (description.trim().length === 0) {
      errors.description = 'Describe what is happening.'
    } else if (description.trim().length > 2000) {
      errors.description = 'Description must be at most 2000 characters.'
    }
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
      errors.priority = 'Select a priority.'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  function continueFromDetails(e: FormEvent): void {
    e.preventDefault()
    if (validateDetails()) setStep('location')
  }

  async function acquireLocation(): Promise<void> {
    setAcquiring(true)
    setSkipped(false)
    try {
      const result = await requestDeviceLocation()
      setOutcome(result)
    } finally {
      setAcquiring(false)
    }
  }

  function continueFromLocation(): void {
    setStep('review')
  }

  async function submitSos(): Promise<void> {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await api<{ incident: Incident }>('/incidents', {
        method: 'POST',
        body: {
          type: incidentType,
          category: category.trim(),
          description: description.trim(),
          priority,
          ...(coords ? { location: coords } : {}),
        },
      })
      setCreated(res.incident)
      setStep('done')
      notify({ title: 'SOS submitted', description: `Incident recorded as ${res.incident.status}.`, variant: 'success' })
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not submit your SOS. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reportAnother(): void {
    setStep('details')
    setIncidentType('')
    setCategory('')
    setDescription('')
    setPriority('')
    setFieldErrors({})
    setOutcome(null)
    setSkipped(false)
    setSubmitError(null)
    setCreated(null)
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex flex-col items-center gap-4 text-center">
        <SosButton size="lg" pulse={step !== 'done'} aria-hidden={false} />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-950">SOS / Emergency</h1>
          <p className="mt-1 text-sm text-ink-500">
            Your request is stored as an incident record. This app does not contact police,
            ambulance, or rescue teams by itself.
          </p>
        </div>
        {step !== 'done' && <Stepper current={step} />}
      </div>

      {step === 'details' && (
        <Card>
          <CardBody>
            <form className="space-y-4" noValidate onSubmit={continueFromDetails}>
              <Select
                label="Incident type"
                placeholder="Select type"
                requiredMark
                value={incidentType}
                error={fieldErrors.type}
                onChange={(e) => setIncidentType(e.target.value)}
                options={[
                  { label: 'Safety', value: 'Safety' },
                  { label: 'Disaster', value: 'Disaster' },
                ]}
              />
              <Select
                label="Category"
                placeholder="Select category"
                requiredMark
                value={category}
                error={fieldErrors.category}
                onChange={(e) => setCategory(e.target.value)}
                options={INCIDENT_CATEGORIES.map((c) => ({ label: c, value: c }))}
              />
              <Textarea
                label="What is happening?"
                rows={4}
                placeholder="Describe the emergency — who is affected, what you see, any immediate danger…"
                requiredMark
                value={description}
                error={fieldErrors.description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <Select
                label="Priority"
                placeholder="Select priority"
                requiredMark
                hint="Choose how urgent this feels. Responders confirm severity on review."
                value={priority}
                error={fieldErrors.priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { label: 'Low', value: 'LOW' },
                  { label: 'Medium', value: 'MEDIUM' },
                  { label: 'High', value: 'HIGH' },
                  { label: 'Critical', value: 'CRITICAL' },
                ]}
              />
              <Button type="submit" fullWidth>
                Continue to location
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {step === 'location' && (
        <Card>
          <CardHeader
            title="Share your location"
            description="Coordinates are captured from your device only — never invented. You can also continue without them."
          />
          <CardBody>
            <div className="space-y-4">
              {!outcome && !acquiring && !skipped && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => void acquireLocation()}>Use device location</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSkipped(true)
                    }}
                  >
                    Continue without location
                  </Button>
                </div>
              )}
              {acquiring && (
                <div className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <Spinner size="md" />
                  <p className="text-sm text-sky-900">Requesting device location… approve the browser prompt.</p>
                </div>
              )}
              {outcome && !acquiring && (
                <Alert variant={outcome.state === 'available' ? 'success' : 'warning'} title={describeOutcome(outcome)}>
                  {outcome.state === 'available' && (
                    <span>
                      {outcome.coords.latitude.toFixed(6)}, {outcome.coords.longitude.toFixed(6)}
                      {outcome.coords.accuracy !== undefined &&
                        ` (±${Math.round(outcome.coords.accuracy)} m)`}
                    </span>
                  )}
                  {outcome.state === 'denied' && (
                    <span>Enable location permission in your browser settings, then retry — or continue without coordinates.</span>
                  )}
                </Alert>
              )}
              {skipped && (
                <Alert variant="warning" title="No coordinates will be attached">
                  The incident will be recorded without location data. No false location is assumed.
                </Alert>
              )}
              {(outcome || skipped) && !acquiring && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {outcome?.state !== 'available' && !skipped && (
                    <Button variant="outline" onClick={() => void acquireLocation()}>
                      Retry location
                    </Button>
                  )}
                  {outcome?.state === 'available' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOutcome(null)
                        setSkipped(true)
                      }}
                    >
                      Remove location
                    </Button>
                  )}
                  {!skipped && outcome?.state !== 'available' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSkipped(true)
                      }}
                    >
                      Continue without location
                    </Button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-3 pt-1">
                <Button variant="ghost" onClick={() => setStep('details')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  disabled={acquiring || (!outcome && !skipped)}
                  onClick={continueFromLocation}
                >
                  Review emergency request
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 'review' && (
        <Card>
          <CardHeader
            title="Review before submitting"
            description="Check the details. Submitting creates a real incident record with status REPORTED."
          />
          <CardBody>
            <div className="space-y-4">
              <dl className="space-y-2 rounded-xl border border-ink-200/70 bg-cream-50 p-4">
                <SummaryRow label="Type">{incidentType}</SummaryRow>
                <SummaryRow label="Category">{category}</SummaryRow>
                <SummaryRow label="Priority">{priority}</SummaryRow>
                <SummaryRow label="Details">{description.trim()}</SummaryRow>
                <SummaryRow label="Location">
                  {coords ? (
                    <span>
                      {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
                      {coords.accuracy !== undefined && ` (±${Math.round(coords.accuracy)} m)`}
                    </span>
                  ) : (
                    <span className="text-ink-500">Not provided — no coordinates attached.</span>
                  )}
                </SummaryRow>
              </dl>
              {submitError && (
                <Alert variant="danger" title="Submission failed" onClose={() => setSubmitError(null)}>
                  {submitError}
                </Alert>
              )}
              <div className="flex flex-col items-center gap-3 pt-1">
                <SosButton size="md" label="Confirm SOS" onClick={() => void submitSos()} pulse={!submitting} />
                {submitting && (
                  <span className="flex items-center gap-2 text-sm text-ink-500">
                    <Spinner size="sm" /> Submitting…
                  </span>
                )}
                <Button variant="ghost" onClick={() => setStep('location')} disabled={submitting}>
                  Back to location
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 'done' && created && (
        <Card>
          <CardBody>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700" aria-hidden>
                ✓
              </span>
              <h2 className="text-xl font-extrabold text-ink-950">SOS recorded</h2>
              <Badge variant={statusBadgeVariant(created.status)} dot>
                {created.status}
              </Badge>
              <dl className="w-full space-y-2 rounded-xl border border-ink-200/70 bg-cream-50 p-4 text-left">
                <SummaryRow label="Reference">{created.id}</SummaryRow>
                <SummaryRow label="Category">{created.category}</SummaryRow>
                <SummaryRow label="Priority">{created.priority}</SummaryRow>
                <SummaryRow label="Recorded">{formatDateTime(created.createdAt)}</SummaryRow>
              </dl>
              <p className="max-w-md text-sm leading-relaxed text-ink-500">
                Your incident is stored and visible on your dashboard with its live status.
                This confirmation does not mean responders have been dispatched — response
                depends on external organizations and availability.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a href="#/dashboard">
                  <Button variant="primary">Go to dashboard</Button>
                </a>
                <Button variant="outline" onClick={reportAnother}>
                  Report another
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
