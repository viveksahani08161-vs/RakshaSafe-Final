import { useState, type ReactNode } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorState,
  FilterBar,
  Form,
  Input,
  Modal,
  Pagination,
  SearchInput,
  Select,
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonText,
  SosButton,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Textarea,
  useToast,
  ActivityIcon,
  BellIcon,
  FileTextIcon,
  HomeIcon,
  MapPinIcon,
  PhoneIcon,
  ShieldIcon,
  UsersIcon,
} from '../components/ui'
import type { NavItem } from '../components/layout/Navbar'
import { AppShell, Header, Navbar } from '../components/layout'

/* ---------- helpers ---------- */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-ink-500">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </section>
  )
}

/* ---------- nav data ---------- */

const sampleNavItems: NavItem[] = [
  { label: 'Dashboard', href: '#admin-ui', active: true, icon: <HomeIcon /> },
  { label: 'Incidents', href: '#', icon: <ActivityIcon /> },
  { label: 'Facilities', href: '#', icon: <PhoneIcon /> },
  { label: 'Rescue Teams', href: '#', icon: <UsersIcon /> },
  { label: 'Reports', href: '#', icon: <FileTextIcon /> },
]

const sampleUserItems: NavItem[] = [
  { label: 'My Incidents', href: '#user-ui', active: true, icon: <FileTextIcon /> },
  { label: 'Resources', href: '#', icon: <MapPinIcon /> },
  { label: 'Notifications', href: '#', icon: <BellIcon /> },
  { label: 'Contacts', href: '#', icon: <PhoneIcon /> },
]

/* ---------- showcase ---------- */

export function DesignSystemShowcase() {
  const { notify } = useToast()
  const [modalOpen, setModalOpen] = useState(false)
  const [dialogDangerOpen, setDialogDangerOpen] = useState(false)
  const [dialogDefaultOpen, setDialogDefaultOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [filterSelect, setFilterSelect] = useState('all')

  return (
    <div className="min-h-svh bg-cream-100">
      {/* ───── top nav user layout demo ───── */}
      <div id="user-ui" className="scroll-mt-0 bg-cream-100">
        <p className="bg-gold-500/90 px-4 py-2 text-center text-xs font-bold uppercase tracking-widest text-white">
          User Interface Demo
        </p>
        <Header
          nav={<Navbar items={sampleUserItems} />}
          actions={
            <Button size="sm" variant="primary" icon={<ShieldIcon />}>
              SOS
            </Button>
          }
          notificationCount={3}
        />
        <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-start gap-6">
            <div className="max-w-xl space-y-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink-950 sm:text-4xl">
                Women Safety &amp; Disaster Emergency Response
              </h1>
              <p className="text-base leading-relaxed text-ink-600">
                Create emergency incidents, find resources, and share your location — all
                from a single, trusted platform.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg">
                  Report Incident
                </Button>
                <Button variant="outline" size="lg">
                  Find Resources
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-14 sm:px-6 lg:px-8">

        {/* ───── colors ───── */}
        <Section id="colors" title="Color Palette" description="Brand tokens — Golden primary, Cream white background, Sky blue secondary, Dark neutral text.">
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">Primary (Gold)</p>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <div className={`size-14 rounded-xl ring-1 ring-ink-200/50 bg-gold-${n}`} />
                    <span className="text-[10px] text-ink-500">{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">Background (Cream)</p>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 300].map((n) => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <div className={`size-14 rounded-xl ring-1 ring-ink-200/50 bg-cream-${n}`} />
                    <span className="text-[10px] text-ink-500">{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">Secondary (Sky)</p>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <div className={`size-14 rounded-xl ring-1 ring-ink-200/50 bg-sky-${n}`} />
                    <span className="text-[10px] text-ink-500">{n}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-400">Text (Ink)</p>
              <div className="flex flex-wrap gap-2">
                {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((n) => (
                  <div key={n} className="flex flex-col items-center gap-1">
                    <div className={`size-14 rounded-xl ring-1 ring-ink-200/50 bg-ink-${n}`} />
                    <span className="text-[10px] text-ink-500">{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ───── buttons ───── */}
        <Section id="buttons" title="Buttons" description="Standard action buttons across all brand variants.">
          <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button fullWidth className="max-w-xs">
                Full width
              </Button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
              <Button variant="outline" loading>Outline Loading</Button>
            </div>
          </div>
        </Section>

        {/* ───── sos ───── */}
        <Section id="sos" title="SOS Button" description="Prominent emergency call-to-action, pulsing ring animation.">
          <div className="flex flex-wrap items-end gap-6">
            <SosButton size="sm" />
            <SosButton size="md" />
            <SosButton size="lg" />
            <SosButton size="xl" />
            <SosButton size="lg" pulse={false} />
          </div>
        </Section>

        {/* ───── badges ───── */}
        <Section id="badges" title="Badges" description="Status indicators and labels.">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="primary" dot>Active</Badge>
            <Badge variant="secondary" dot>Assigned</Badge>
            <Badge variant="success" dot>Resolved</Badge>
            <Badge variant="warning" dot>Pending</Badge>
            <Badge variant="danger" dot>Failed</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </Section>

        {/* ───── cards ───── */}
        <Section id="cards" title="Cards" description="Container components with optional sections.">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader title="Basic Card" description="Simple card content." />
              <CardBody>
                <p className="text-sm text-ink-600">This is a basic card with header and body content. Cards adapt to their container width.</p>
              </CardBody>
            </Card>
            <Card>
              <CardHeader
                title="With Action"
                description="Card with an action button."
                action={<Button variant="ghost" size="sm">Edit</Button>}
              />
              <CardBody>
                <div className="flex items-center gap-3">
                  <SkeletonAvatar />
                  <div className="space-y-1">
                    <SkeletonText className="w-32" />
                    <SkeletonText className="w-48" />
                  </div>
                </div>
              </CardBody>
              <CardFooter>
                <p className="text-xs text-ink-400">Updated 2 hours ago</p>
                <Button size="sm">View details</Button>
              </CardFooter>
            </Card>
            <Card className="bg-gold-50/60 ring-1 ring-gold-200/60">
              <CardHeader title="Gold Accent" description="Card with gold background tone." />
              <CardBody>
                <p className="text-sm text-ink-600">Use gold accents for priority or highlighted content sections.</p>
              </CardBody>
            </Card>
          </div>
        </Section>

        {/* ───── forms ───── */}
        <Section id="forms" title="Form Controls" description="Input, select, textarea, checkbox with label, hint, and error states.">
          <Form title="Report Incident" description="Submit an emergency report with the details below.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Full name" placeholder="Jane Doe" requiredMark defaultValue="" />
              <Input label="Phone number" placeholder="+91 98765 43210" defaultValue="" />
              <Input label="Search resources" placeholder="Search..." leftIcon={<MapPinIcon />} />
              <Input label="Invalid field" defaultValue="Bad value" error="This field is required." />
              <Select label="Incident type" placeholder="Select type" options={[
                { label: 'Women Safety', value: 'women' },
                { label: 'Medical Emergency', value: 'medical' },
                { label: 'Fire', value: 'fire' },
                { label: 'Flood', value: 'flood' },
                { label: 'Earthquake', value: 'earthquake' },
                { label: 'Other', value: 'other' },
              ]} />
              <Select label="Priority" defaultValue="high" options={[
                { label: 'Low', value: 'low' },
                { label: 'Medium', value: 'medium' },
                { label: 'High', value: 'high' },
                { label: 'Critical', value: 'critical' },
              ]} />
            </div>
            <Textarea label="Description" rows={3} placeholder="Provide any additional details..." hint="Include as much detail as possible." />
            <Checkbox label="Notify emergency contacts" hint="Your emergency contacts will receive a notification." />
          </Form>
        </Section>

        {/* ───── data ───── */}
        <Section id="data" title="Data Display" description="Table, search, filters, and pagination for tabular data views.">
          <div className="space-y-4">
            <FilterBar
              search={
                <SearchInput
                  placeholder="Search incidents..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onClear={() => setSearchValue('')}
                />
              }
              filters={
                <Select
                  className="w-40"
                  value={filterSelect}
                  onChange={(e) => setFilterSelect(e.target.value)}
                  options={[
                    { label: 'All types', value: 'all' },
                    { label: 'Women Safety', value: 'women' },
                    { label: 'Medical', value: 'medical' },
                    { label: 'Fire', value: 'fire' },
                  ]}
                />
              }
              resultCount={<span>Showing 3 of 3 incidents</span>}
              actions={<Button size="sm" variant="outline">Export</Button>}
              onReset={() => { setSearchValue(''); setFilterSelect('all') }}
            />
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Incident</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>Priority</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Time</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <span className="font-medium text-ink-900">#INC-1024</span>
                  </TableCell>
                  <TableCell>Women Safety</TableCell>
                  <TableCell><Badge variant="danger" dot>High</Badge></TableCell>
                  <TableCell><Badge variant="primary" dot>Active</Badge></TableCell>
                  <TableCell className="text-ink-500">5 min ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <span className="font-medium text-ink-900">#INC-1025</span>
                  </TableCell>
                  <TableCell>Medical</TableCell>
                  <TableCell><Badge variant="warning" dot>Medium</Badge></TableCell>
                  <TableCell><Badge variant="secondary" dot>Assigned</Badge></TableCell>
                  <TableCell className="text-ink-500">12 min ago</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    <span className="font-medium text-ink-900">#INC-1026</span>
                  </TableCell>
                  <TableCell>Fire</TableCell>
                  <TableCell><Badge variant="danger" dot>Critical</Badge></TableCell>
                  <TableCell><Badge variant="neutral">Closed</Badge></TableCell>
                  <TableCell className="text-ink-500">1 hour ago</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Pagination current={page} totalPages={12} onPageChange={setPage} />
          </div>
        </Section>

        {/* ───── alerts ───── */}
        <Section id="alerts" title="Alerts" description="Inline informational and status messages.">
          <div className="space-y-3 max-w-2xl">
            <Alert variant="info" title="Information">This is a general information message.</Alert>
            <Alert variant="success" title="Success">Your incident has been reported successfully.</Alert>
            <Alert variant="warning" title="Warning">Location accuracy may be low in this area.</Alert>
            <Alert variant="danger" title="Error">Unable to send notification to emergency contact.</Alert>
            <Alert variant="success" title="Dismissible" onClose={() => notify({ title: 'Alert dismissed', variant: 'info', duration: 2000 })}>This alert can be closed.</Alert>
          </div>
        </Section>

        {/* ───── feedback ───── */}
        <Section id="feedback" title="Loading, Empty, and Error States">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Spinner size="sm" /> <Spinner size="md" /> <Spinner size="lg" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <Skeleton lines={3} className="max-w-md" />
            <EmptyState
              title="No incidents yet"
              description="When you report an emergency, your incidents will appear here."
              action={<Button size="sm">Create your first incident</Button>}
            />
            <ErrorState
              title="Failed to load incidents"
              description="We couldn't reach the server. Please check your connection and try again."
              onRetry={() => notify({ title: 'Retrying...', variant: 'info', duration: 2000 })}
            />
          </div>
        </Section>

        {/* ───── overlays ───── */}
        <Section id="overlays" title="Overlays" description="Modals, dialogs, and toast notifications.">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setModalOpen(true)}>Open Modal</Button>
            <Button variant="outline" onClick={() => setDialogDefaultOpen(true)}>Confirm Dialog</Button>
            <Button variant="danger" onClick={() => setDialogDangerOpen(true)}>Danger Dialog</Button>
            <Button variant="primary" onClick={() => notify({ title: 'Incident created', description: 'Your SOS has been reported.', variant: 'success' })}>Show Success Toast</Button>
            <Button variant="outline" onClick={() => notify({ title: 'Connection lost', variant: 'danger' })}>Show Error Toast</Button>
            <Button variant="outline" onClick={() => notify({ title: 'Syncing...', variant: 'info' })}>Show Info Toast</Button>
          </div>

          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example Modal" description="A simple modal overlay with a scrollable body.">
            <p className="text-sm text-ink-600">
              This is a reusable modal component. It renders in a portal, traps focus, closes on ESC, and prevents body scroll while open. Use it for any overlay content — forms, confirmations, or detail panels.
            </p>
          </Modal>

          <Dialog
            open={dialogDefaultOpen}
            onClose={() => setDialogDefaultOpen(false)}
            title="Confirm action"
            onConfirm={() => { setDialogDefaultOpen(false); notify({ title: 'Confirmed', variant: 'success' }) }}
          >
            Are you sure you want to proceed with this action?
          </Dialog>

          <Dialog
            open={dialogDangerOpen}
            onClose={() => setDialogDangerOpen(false)}
            variant="danger"
            title="Delete incident"
            confirmLabel="Delete"
            onConfirm={() => { setDialogDangerOpen(false); notify({ title: 'Deleted', variant: 'danger' }) }}
          >
            This action cannot be undone. The incident and all associated data will be permanently removed.
          </Dialog>
        </Section>

        {/* ───── admin layout demo ───── */}
        <section id="admin-ui" className="scroll-mt-24 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-ink-900">Admin Interface — AppShell Layout</h2>
            <p className="mt-1 text-sm text-ink-500">
              The admin uses a fixed sidebar shell with the same branded Header and component library.
              Below is a live AppShell rendered inside this page.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-ink-200 shadow-sm shadow-ink-900/5 ring-1 ring-ink-200/70">
            <div className="h-[520px]">
              <AppShell
                items={sampleNavItems}
                actions={<Button size="sm" variant="primary">+ New</Button>}
                notificationCount={7}
                sidebarFooter={
                  <p className="px-3 py-2 text-xs text-ink-400">RakshaSafe Admin v0.1</p>
                }
              >
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-ink-900">Dashboard</h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: 'Total incidents', value: '24' },
                      { label: 'Active', value: '9' },
                      { label: 'Resolved', value: '11' },
                      { label: 'Teams', value: '5' },
                    ].map((stat) => (
                      <div key={stat.label} className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-bold uppercase tracking-widest text-ink-400">{stat.label}</p>
                        <p className="mt-1 text-3xl font-extrabold text-ink-900">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  <Card>
                    <CardHeader title="Recent Incidents" />
                    <CardBody>
                      <p className="text-sm text-ink-500">Admin dashboard content uses the same Card, Table, Badge, and Button components shown above.</p>
                    </CardBody>
                  </Card>
                </div>
              </AppShell>
            </div>
          </div>
        </section>
      </div>

      {/* ───── bottom nav/user layout summary ───── */}
      <footer className="border-t border-ink-200 bg-cream-50 py-10 text-center text-sm text-ink-400">
        RakshaSafe Design System Foundation · B.Sc. IT Final Year Project
      </footer>
    </div>
  )
}

export default DesignSystemShowcase