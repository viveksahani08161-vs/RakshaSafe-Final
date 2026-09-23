import { useEffect, useState } from 'react'
import { ToastProvider } from './components/ui/Toast'
import { RequireAdmin, RequireAuth, RequireResponder } from './components/auth/guards'
import { Header } from './components/layout/Header'
import { Navbar, type NavItem } from './components/layout/Navbar'
import { Badge } from './components/ui/Badge'
import { Button } from './components/ui/Button'
import { Logo } from './components/ui/Logo'
import { Spinner } from './components/ui/Spinner'
import { ActivityIcon, AlertTriangleIcon, BellIcon, BuildingIcon, FileTextIcon, HomeIcon, ListIcon, MapPinIcon, PhoneIcon, ShieldIcon, UserIcon, UsersIcon } from './components/ui/icons'
import { api } from './lib/api'
import { useAuth } from './lib/auth-context'
import { AuthProvider } from './lib/AuthProvider'
import { ThemeProvider } from './lib/theme'
import { navigateTo, parseHash, useHashRoute, type AppRoute } from './lib/hash-route'
import { I18nProvider, useI18n } from './lib/i18n'
import { getLastSeen, isUnread, type NotificationItem } from './lib/notifications'
import { AdminFacilitiesPage } from './pages/AdminFacilitiesPage'
import { AdminIncidentDetailPage } from './pages/AdminIncidentDetailPage'
import { AdminIncidentsPage } from './pages/AdminIncidentsPage'
import { AdminTeamsPage } from './pages/AdminTeamsPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AdminUserDetailPage } from './pages/AdminUserDetailPage'
import { DashboardPage } from './pages/DashboardPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminUnsafeReportsPage } from './pages/AdminUnsafeReportsPage'
import { IncidentDetailPage } from './pages/IncidentDetailPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ResourcesPage } from './pages/ResourcesPage'
import { UnsafeReportsPage } from './pages/UnsafeReportsPage'
import { EmergencyContactsPage } from './pages/EmergencyContactsPage'
import { LoginPage } from './pages/LoginPage'
import { ResponderDashboardPage } from './pages/ResponderDashboardPage'
import { SosPage } from './pages/SosPage'
import { ProfilePage } from './pages/ProfilePage'
import { RegisterPage } from './pages/RegisterPage'

function Shell() {
  const route = useHashRoute()
  const { user, initializing, busy, logout } = useAuth()
  const { t } = useI18n()
  const [unreadCount, setUnreadCount] = useState(0)

  const getRoleLabel = (role: 'USER' | 'ADMIN' | 'RESPONDER') => {
    switch (role) {
      case 'ADMIN':
        return t('role.admin')
      case 'RESPONDER':
        return t('role.responder')
      default:
        return t('role.user')
    }
  }
  const roleLabel = user ? getRoleLabel(user.role) : ''

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
    // Decide from the live hash, not the possibly-stale route state: right
    // after an auth transition a queued navigation may not have rendered yet,
    // and redirecting on stale state would clobber it.
    const live = parseHash()
    if (!user && live !== '/login' && live !== '/register') {
      navigateTo('/login')
    } else if (user && (live === '/login' || live === '/register')) {
      navigateTo(user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'RESPONDER' ? '/responder' : '/dashboard')
    } else if (user && user.role === 'RESPONDER' && (live === '/dashboard' || live === '/sos' || live.startsWith('/admin/'))) {
      navigateTo('/responder')
    } else if (user && live === '/responder' && user.role === 'USER') {
      navigateTo('/dashboard')
    } else if (user && live === '/responder' && user.role === 'ADMIN') {
      navigateTo('/admin/dashboard')
    } else if (user && user.role !== 'ADMIN' && live.startsWith('/admin/')) {
      navigateTo('/dashboard')
    }
  }, [initializing, user, route])

  async function handleLogout(): Promise<void> {
    await logout()
    navigateTo('/login')
  }

  const items: NavItem[] = []
  if (user && user.role === 'RESPONDER') {
    items.push({ label: t('nav.assignments'), href: '#/responder', icon: <ShieldIcon />, active: route === '/responder' })
    items.push({ label: t('nav.myProfile'), href: '#/profile', icon: <HomeIcon />, active: route === '/profile' })
  } else if (user) {
    items.push({ label: t('nav.dashboard'), href: '#/dashboard', icon: <HomeIcon />, active: route === '/dashboard' })
    items.push({ label: t('nav.sos'), href: '#/sos', icon: <ShieldIcon />, active: route === '/sos' })
    items.push({ label: t('nav.contacts'), href: '#/contacts', icon: <PhoneIcon />, active: route === '/contacts' })
    items.push({ label: t('nav.resources'), href: '#/resources', icon: <MapPinIcon />, active: route === '/resources' })
    items.push({ label: t('nav.reportUnsafe'), href: '#/report-unsafe', icon: <AlertTriangleIcon />, active: route === '/report-unsafe' })
    items.push({ label: t('nav.notifications'), href: '#/notifications', icon: <BellIcon />, active: route === '/notifications' })
    items.push({ label: t('nav.myProfile'), href: '#/profile', icon: <HomeIcon />, active: route === '/profile' })
    if (user.role === 'ADMIN') {
      items.push({ label: t('nav.overview'), href: '#/admin/dashboard', icon: <HomeIcon />, active: route === '/admin/dashboard' })
      items.push({
        label: t('nav.incidents'),
        href: '#/admin/incidents',
        icon: <ActivityIcon />,
        active: route === '/admin/incidents' || route === '/admin/incident-detail',
      })
      items.push({ label: t('nav.facilities'), href: '#/admin/facilities', icon: <BuildingIcon />, active: route === '/admin/facilities' })
      items.push({ label: t('nav.teams'), href: '#/admin/teams', icon: <UserIcon />, active: route === '/admin/teams' })
      items.push({ label: t('nav.unsafeAreas'), href: '#/admin/unsafe-reports', icon: <ListIcon />, active: route === '/admin/unsafe-reports' })
      items.push({ label: t('nav.reports'), href: '#/admin/reports', icon: <FileTextIcon />, active: route === '/admin/reports' })
      items.push({ label: t('nav.users'), href: '#/admin/users', icon: <UsersIcon />, active: route === '/admin/users' })
    }
  }

  return (
    <div className="min-h-svh">
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
                aria-label={unreadCount > 0 ? t('notification.unreadCount', { count: unreadCount }) : t('nav.notifications')}
                className="relative inline-flex size-10 items-center justify-center rounded-xl text-ink-700 transition-colors hover:bg-ink-100"
              >
                <BellIcon className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white dark:text-ink-950">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </a>
              <span className="hidden text-sm font-semibold text-ink-700 sm:inline">{user.name}</span>
              <span className="hidden sm:inline">
                <Badge variant={user.role === 'ADMIN' ? 'secondary' : 'primary'}>{roleLabel}</Badge>
              </span>
              <Button size="sm" variant="outline" onClick={() => void handleLogout()} disabled={busy}>
                {t('nav.logout')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a href="#/login">
                <Button size="sm" variant="ghost">
                  {t('auth.login')}
                </Button>
              </a>
              <a href="#/register">
                <Button size="sm" variant="primary">
                  {t('auth.register')}
                </Button>
              </a>
            </div>
          )
        }
      />

      <main className={route === '/login' ? 'min-h-[calc(100svh-4rem)]' : 'mx-auto w-full max-w-7xl px-4 py-10 sm:px-6'}>
        {initializing ? (
          <div className="flex justify-center py-20" role="status" aria-label={t('common.loading')}>
            <Spinner size="lg" />
          </div>
        ) : (
          <RouteView route={route} />
        )}
      </main>

      <footer className="border-t border-ink-200 bg-cream-50 py-6 text-center text-sm text-ink-400">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4">
          <Logo size="sm" withWordmark={false} />
          <span>RakshaSafe · Women Safety &amp; Disaster Management System</span>
          <span aria-hidden="true">·</span>
          <span>Developed by Vivek &amp; Vaibhav</span>
        </span>
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
    case '/responder':
      return (
        <RequireResponder>
          <ResponderDashboardPage />
        </RequireResponder>
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
    case '/admin/user-detail':
      return (
        <RequireAdmin>
          <AdminUserDetailPage />
        </RequireAdmin>
      )
    case '/login':
    default:
      return <LoginPage />
  }
}

function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <ToastProvider>
          <AuthProvider>
            <Shell />
          </AuthProvider>
        </ToastProvider>
      </I18nProvider>
    </ThemeProvider>
  )
}

export default App
