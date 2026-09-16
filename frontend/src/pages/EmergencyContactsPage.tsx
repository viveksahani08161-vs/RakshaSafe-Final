import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ApiError, api } from '../lib/api'
import { useToast } from '../components/ui/toast-context'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { Checkbox } from '../components/ui/Checkbox'
import { Dialog } from '../components/ui/Dialog'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Form } from '../components/ui/Form'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Skeleton } from '../components/ui/Skeleton'
import { PhoneIcon } from '../components/ui/icons'

export interface Contact {
  id: string
  userId: string
  name: string
  phone: string
  email?: string
  relationship?: string
  notifyViaSms: boolean
  notifyViaEmail: boolean
  createdAt: string
  updatedAt: string
}

type FieldErrors = Record<string, string>

interface ModalState {
  mode: 'create' | 'edit'
  contact?: Contact
}

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  relationship: '',
  notifyViaSms: true,
  notifyViaEmail: false,
}

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

export function EmergencyContactsPage() {
  const { notify } = useToast()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await api<{ contacts: Contact[] }>(
        '/emergency-contacts',
        signal ? { signal } : {},
      )
      setContacts(res.contacts)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setLoadError(err instanceof ApiError ? err.message : 'Could not load emergency contacts.')
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

  function openCreate(): void {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
    setModal({ mode: 'create' })
  }

  function openEdit(contact: Contact): void {
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email ?? '',
      relationship: contact.relationship ?? '',
      notifyViaSms: contact.notifyViaSms,
      notifyViaEmail: contact.notifyViaEmail,
    })
    setFieldErrors({})
    setFormError(null)
    setModal({ mode: 'edit', contact })
  }

  function closeModal(): void {
    if (!saving) setModal(null)
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!modal) return
    setSaving(true)
    setFieldErrors({})
    setFormError(null)
    try {
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        relationship: form.relationship.trim(),
        notifyViaSms: form.notifyViaSms,
        notifyViaEmail: form.notifyViaEmail,
      }
      if (modal.mode === 'create') {
        await api<{ contact: Contact }>('/emergency-contacts', { method: 'POST', body })
        notify({ title: 'Contact added', description: `${body.name} will be notified in emergencies.`, variant: 'success' })
      } else if (modal.contact) {
        await api<{ contact: Contact }>(`/emergency-contacts/${modal.contact.id}`, {
          method: 'PATCH',
          body,
        })
        notify({ title: 'Contact updated', variant: 'success' })
      }
      setModal(null)
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
      setSaving(false)
    }
  }

  async function onConfirmDelete(): Promise<void> {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api(`/emergency-contacts/${deleteTarget.id}`, { method: 'DELETE' })
      notify({ title: 'Contact deleted', description: deleteTarget.name, variant: 'info' })
      setDeleteTarget(null)
      await load()
    } catch (err) {
      notify({
        title: 'Delete failed',
        description: err instanceof ApiError ? err.message : 'Please try again.',
        variant: 'danger',
      })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <Card>
        <CardHeader
          title="Emergency contacts"
          description="People to notify when you raise an SOS. Only you can see and manage these contacts."
          action={
            <Button size="sm" variant="primary" onClick={openCreate}>
              + Add Contact
            </Button>
          }
        />
        <CardBody>
          {loading && (
            <div className="space-y-2" aria-label="Loading emergency contacts">
              <Skeleton lines={4} />
            </div>
          )}
          {!loading && loadError && (
            <ErrorState
              title="Could not load contacts"
              description={loadError}
              onRetry={() => void load()}
            />
          )}
          {!loading && !loadError && contacts.length === 0 && (
            <EmptyState
              title="No emergency contacts yet"
              description="Add the people you trust — they will be notified first when you need help."
              action={
                <Button size="sm" variant="primary" onClick={openCreate}>
                  Add your first contact
                </Button>
              }
            />
          )}
          {!loading && !loadError && contacts.length > 0 && (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className="flex flex-col gap-3 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-sm shadow-ink-900/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-ink-900">{contact.name}</p>
                      {contact.relationship && (
                        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-ink-400">
                          {contact.relationship}
                        </p>
                      )}
                    </div>
                    <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gold-100 text-gold-700">
                      <PhoneIcon className="size-5" />
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-ink-800">{contact.phone}</p>
                    {contact.email && (
                      <p className="break-all text-ink-500">{contact.email}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {contact.notifyViaSms && (
                      <Badge variant="secondary">SMS alerts</Badge>
                    )}
                    {contact.notifyViaEmail && (
                      <Badge variant="primary">Email alerts</Badge>
                    )}
                    {!contact.notifyViaSms && !contact.notifyViaEmail && (
                      <Badge variant="neutral">No auto alerts</Badge>
                    )}
                  </div>
                  <div className="mt-auto flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(contact)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(contact)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Modal
        open={modal !== null}
        onClose={closeModal}
        title={modal?.mode === 'edit' ? 'Edit emergency contact' : 'Add emergency contact'}
        description="Contact details are visible only to you."
      >
        <Form onSubmit={(e: FormEvent) => void onSubmit(e)}>
          {formError && (
            <Alert variant="danger" title="Could not save contact" onClose={() => setFormError(null)}>
              {formError}
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              name="contact-name"
              placeholder="Aarav Sharma"
              requiredMark
              value={form.name}
              error={fieldErrors.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Phone number"
              name="contact-phone"
              type="tel"
              placeholder="+91 98765 43210"
              requiredMark
              value={form.phone}
              error={fieldErrors.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <Input
              label="Email (optional)"
              name="contact-email"
              type="email"
              placeholder="contact@example.com"
              value={form.email}
              error={fieldErrors.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <Input
              label="Relationship (optional)"
              name="contact-relationship"
              placeholder="Brother, Friend, …"
              value={form.relationship}
              error={fieldErrors.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            />
          </div>
          {(fieldErrors.notifyViaSms ?? fieldErrors.notifyViaEmail) && (
            <Alert variant="danger">{fieldErrors.notifyViaSms ?? fieldErrors.notifyViaEmail}</Alert>
          )}
          <div className="flex flex-col gap-2">
            <Checkbox
              label="Notify via SMS"
              checked={form.notifyViaSms}
              onChange={(e) => setForm((f) => ({ ...f, notifyViaSms: e.target.checked }))}
            />
            <Checkbox
              label="Notify via Email"
              checked={form.notifyViaEmail}
              onChange={(e) => setForm((f) => ({ ...f, notifyViaEmail: e.target.checked }))}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saving} disabled={saving}>
              {modal?.mode === 'edit' ? 'Save changes' : 'Add contact'}
            </Button>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
          </div>
        </Form>
      </Modal>

      <Dialog
        open={deleteTarget !== null}
        onClose={() => {
          if (!deleting) setDeleteTarget(null)
        }}
        variant="danger"
        title={`Delete ${deleteTarget?.name ?? 'contact'}?`}
        confirmLabel="Delete"
        confirmLoading={deleting}
        onConfirm={() => void onConfirmDelete()}
      >
        This contact will be permanently removed and will no longer receive emergency notifications.
      </Dialog>
    </div>
  )
}
