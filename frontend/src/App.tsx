import { useEffect, useState } from 'react'
import { ToastProvider } from './components/ui/Toast'
import { RequireAdmin, RequireAuth } from './components/auth/guards'
import { Header } from './components/layout/Header'
import { Navbar, type NavItem } from './components/layout/Navbar'
import { Badge } from './components/ui/Badge'
import { Button } from './components/ui/Button'
import { Spinner } from './components/ui/Spinner'
import { ActivityIcon, AlertTriangleIcon, BellIcon, BuildingIcon, FileTextIcon, HomeIcon, ListIcon, MapPinIcon, PhoneIcon, ShieldIcon, UserIcon, UsersIcon } from './components/ui/icons'
import { api } from './lib/api'
import { useAuth } from './lib/auth-context'
import { AuthProvider } from './lib/AuthProvider'
import { navigateTo, useHashRoute, type AppRoute } from './lib/hash-route'
import { getLastSeen, isUnread, type NotificationItem } from './lib/notifications'
import { AdminFacilitiesPage } from './pages/AdminFacilitiesPage'
import { AdminIncidentDetailPage } from './pages/AdminIncidentDetailPage'
import { AdminIncidentsPage } from './pages/AdminIncidentsPage'
import { AdminTeamsPage } from './pages/AdminTeamsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminUnsafeReportsPage } from './pages/AdminUnsafeReportsPage'
import { IncidentDetailPage } from './pages/IncidentDetailPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { UnsafeReportsPage } from './pages/UnsafeReportsPage'
import { DesignSystemShowcase } from './pages/DesignSystemShowcase'
import { EmergencyContactsPage } from './pages/EmergencyContactsPage'
import { LoginPage } from './pages/LoginPage'
import { SosPage } from './pages/SosPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'

function Shell() {
  const route = useHashRoute()
  const { user, initializing, busy, logout } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // The bell unmounts on logout, so no synchronous reset is needed here;
    // the count refreshes from the backend on every sign-in and navigation.
    if (!user || initializing) {
      return
    }
    let cancelled = false
    async function fetchUnread(): Promise<void> {
      try {
        const res = await api<{ notifications: NotificationItem[] }>('/notifications')
        if (cancelled || !user) return
        const cursor = getLastSeen(user.id)
        setUnreadCount(res.notifications.filter((n) => isUnread(n, cursor)).length)
      } catch {
        if (!cancelled) setUnreadCount(0)
      }
    }
    void fetchUnread()
    return () => {
      cancelled = true
    }
  }, [user, initializing, route])

  useEffect(() => {
    if (initializing) return
    if (!user && route !== '/login' && route !== '/register' && route !== '/design-system') {
      navigateTo('/login')
    } else if (user && (route === '/login' || route === '/register')) {
      navigateTo('/dashboard')
    } else if (user && user.role !== 'ADMIN' && route.startsWith('/admin/')) {
      navigateTo('/dashboard')
    }
  }, [initializing, user, route])

  async function handleLogout(): Promise<void> {
    await logout()
    navigateTo('/login')
  }

  const items: NavItem[] = []
  if (user) {
    items.push({ label: 'Dashboard', href: '#/dashboard', icon: <HomeIcon />, active: route === '/dashboard' })
    items.push({ label: 'SOS', href: '#/sos', icon: <ShieldIcon />, active: route === '/sos' })
    items.push({ label: 'Emergency Contacts', href: '#/contacts', icon: <PhoneIcon />, active: route === '/contacts' })
    items.push({ label: 'Resources', href: '#/resources', icon: <MapPinIcon />, active: route === '/resources' })
    items.push({ label: 'Report Unsafe', href: '#/report-unsafe', icon: <AlertTriangleIcon />, active: route === '/report-unsafe' })
    items.push({ label: 'Notifications', href: '#/notifications', icon: <BellIcon />, active: route === '/notifications' })
    items.push({ label: 'My Profile', href: '#/profile', icon: <HomeIcon />, active: route === '/profile' })
    if (user.role === 'ADMIN') {
      items.push({ label: 'Overview', href: '#/admin/dashboard', icon: <HomeIcon />, active: route === '/admin/dashboard' })
      items.push({
        label: 'Incidents',
        href: '#/admin/incidents',
        icon: <ActivityIcon />,
        active: route === '/admin/incidents' || route === '/admin/incident-detail',
      })
      items.push({ label: 'Facilities', href: '#/admin/facilities', icon: <BuildingIcon />, active: route === '/admin/facilities' })
      items.push({ label: 'Teams', href: '#/admin/teams', icon: <UserIcon />, active: route === '/admin/teams' })
      items.push({ label: 'Unsafe Areas', href: '#/admin/unsafe-reports', icon: <ListIcon />, active: route === '/admin/unsafe-reports' })
      items.push({ label: 'Reports', href: '#/admin/reports', icon: <FileTextIcon />, active: route === '/admin/reports' })
      items.push({ label: 'Users', href: '#/admin/users', icon: <UsersIcon />, active: route === '/admin/users' })
    }
  }
  items.push({
    label: 'Design System',
    href: '#/design-system',
    icon: <ShieldIcon />,
    active: route === '/design-system',
  })

  return (
    <div className="min-h-svh bg-cream-100">
      <Header
        nav={<Navbar items={items} />}
        showNotifications={false}
        actions={
          initializing ? (
            <Spinner size="sm" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <a
                href="#/notifications"
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
                className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-ink-100"
              >
                <BellIcon className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </a>
              <span className="hidden text-sm font-semibold text-ink-700 sm:inline">{user.name}</span>
              <Badge variant={user.role === 'ADMIN' ? 'secondary' : 'primary'}>{user.role}</Badge>
              <Button size="sm" variant="outline" onClick={() => void handleLogout()} disabled={busy}>
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a href="#/login">
                <Button size="sm" variant="ghost">
                  Log in
                </Button>
              </a>
              <a href="#/register">
                <Button size="sm" variant="primary">
                  Register
                </Button>
              </a>
            </div>
          )
        }
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        {initializing ? (
          <div className="flex justify-center py-20" role="status" aria-label="Loading">
            <Spinner size="lg" />
          </div>
        ) : (
          <RouteView route={route} />
        )}
      </main>

      <footer className="border-t border-ink-200 bg-cream-50 py-6 text-center text-sm text-ink-400">
        RakshaSafe · Women Safety &amp; Disaster Emergency Response
      </footer>
    </div>
  )
}

function RouteView({ route }: { route: AppRoute }) {
  switch (route) {
    case '/register':
      return <RegisterPage />
    case '/dashboard':
      return (
        <RequireAuth>
          <DashboardPage />
        </RequireAuth>
      )
    case '/sos':
      return (
        <RequireAuth>
          <SosPage />
        </RequireAuth>
      )
    case '/profile':
      return (
        <RequireAuth>
          <ProfilePage />
        </RequireAuth>
      )
    case '/contacts':
      return (
        <RequireAuth>
          <EmergencyContactsPage />
        </RequireAuth>
      )
    case '/resources':
      return (
        <RequireAuth>
          <ResourcesPage />
        </RequireAuth>
      )
    case '/notifications':
      return (
        <RequireAuth>
          <NotificationsPage />
        </RequireAuth>
      )
    case '/admin/reports':
      return (
        <RequireAdmin>
          <ReportsPage />
        </RequireAdmin>
      )
    case '/report-unsafe':
      return (
        <RequireAuth>
          <UnsafeReportsPage />
        </RequireAuth>
      )
    case '/admin/unsafe-reports':
      return (
        <RequireAdmin>
          <AdminUnsafeReportsPage />
        </RequireAdmin>
      )
    case '/incident-detail':
      return (
        <RequireAuth>
          <IncidentDetailPage />
        </RequireAuth>
      )
    case '/admin/facilities':
      return (
        <RequireAdmin>
          <AdminFacilitiesPage />
        </RequireAdmin>
      )
    case '/admin/teams':
      return (
        <RequireAdmin>
          <AdminTeamsPage />
        </RequireAdmin>
      )
    case '/admin/incidents':
      return (
        <RequireAdmin>
          <AdminIncidentsPage />
        </RequireAdmin>
      )
    case '/admin/incident-detail':
      return (
        <RequireAdmin>
          <AdminIncidentDetailPage />
        </RequireAdmin>
      )
    case '/admin/dashboard':
      return (
        <RequireAdmin>
          <AdminDashboardPage />
        </RequireAdmin>
      )
    case '/admin/users':
      return (
        <RequireAdmin>
          <AdminUsersPage />
        </RequireAdmin>
      )
    case '/design-system':
      return <DesignSystemShowcase />
    case '/login':
    default:
      return <LoginPage />
  }
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  )
}

export default App
