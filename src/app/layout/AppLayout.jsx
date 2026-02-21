import { useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import { appConfig } from '@/constants/appConfig'
import { collections } from '@/constants/collections'
import { databaseId } from '@/constants/database'
import { getPostLoginRoute } from '@/features/auth/utils/authMessages'
import { notificationsService } from '@/features/notifications/services/notificationsService'
import { useAuth } from '@/hooks/useAuth'
import { realtimeService } from '@/services/appwrite/realtime'
import { useAppStore } from '@/store/appStore'

function IconMenu() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function IconListings() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 5h18M3 12h18M3 19h18" />
    </svg>
  )
}

function IconDashboard() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M3 13h8V3H3v10zm10 8h8V3h-8v18zm-10 0h8v-6H3v6z" />
    </svg>
  )
}

function IconManage() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M12 3v6m0 0l3-3m-3 3L9 6M5 12h14M12 21v-6m0 0l3 3m-3-3l-3 3" />
    </svg>
  )
}

function IconApplications() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M8 7h8M8 12h8M8 17h5M6 3h12a2 2 0 012 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 012-2z" />
    </svg>
  )
}

function IconMessages() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
    </svg>
  )
}

function IconNotifications() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  )
}

function renderNavIcon(iconName) {
  if (iconName === 'dashboard') {
    return <IconDashboard />
  }

  if (iconName === 'manage') {
    return <IconManage />
  }

  if (iconName === 'applications') {
    return <IconApplications />
  }

  if (iconName === 'messages') {
    return <IconMessages />
  }

  if (iconName === 'notifications') {
    return <IconNotifications />
  }

  return <IconListings />
}

function sidebarLinkClass({ isActive, collapsed }) {
  const base = 'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'

  if (isActive) {
    return `${base} border border-brand-400/35 bg-brand-500/20 text-brand-50 shadow-sm`
  }

  return `${base} text-slate-300 hover:bg-slate-800 hover:text-slate-100 ${collapsed ? 'justify-center' : ''}`
}

function toShortLabel(label) {
  const initials = String(label)
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return initials || String(label).slice(0, 2).toUpperCase()
}

const publicMarketNavItems = [
  {
    id: 'buy',
    label: 'Buy',
    to: '/listings?mode=buy&category=property',
    submenu: [
      { label: 'Property', to: '/listings?mode=buy&category=property' },
      { label: 'Land', to: '/listings?mode=buy&category=land' },
    ],
  },
  {
    id: 'rent',
    label: 'Rent',
    to: '/listings?mode=rent&category=property',
    submenu: [
      { label: 'Property', to: '/listings?mode=rent&category=property' },
      { label: 'Land', to: '/listings?mode=rent&category=land' },
    ],
  },
]

function buildNavigationItems({ role, isAuthenticated, notificationCount }) {
  const items = [{ label: 'Listings', to: '/listings', icon: 'listings' }]

  if (role === 'landlord') {
    items.push(
      { label: 'Landlord Dashboard', to: '/dashboard/landlord', icon: 'dashboard' },
      { label: 'Manage Listings', to: '/dashboard/landlord/listings', icon: 'manage' },
      { label: 'Applications', to: '/dashboard/landlord/applications', icon: 'applications' },
    )
  }

  if (role === 'tenant') {
    items.push({ label: 'Applications', to: '/dashboard/tenant/applications', icon: 'applications' })
  }

  if (isAuthenticated) {
    items.push({ label: 'Messages', to: '/messages', icon: 'messages' })
    items.push({
      label: 'Notifications',
      to: '/notifications',
      icon: 'notifications',
      badge: notificationCount > 0 ? String(notificationCount) : '',
    })
  }

  return items
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, isEmailVerified, role, user, logout } = useAuth()
  const notificationCount = useAppStore((state) => state.notificationCount)
  const setNotificationCount = useAppStore((state) => state.setNotificationCount)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [openPublicMenuId, setOpenPublicMenuId] = useState('')
  const publicMenuCloseTimeoutRef = useRef(null)
  const userId = user?.$id || ''
  const isAuthRoute = location.pathname.startsWith('/auth/')
  const isListingsRoute = location.pathname.startsWith('/listings')
  const shouldShowSidebar = !isAuthRoute && isAuthenticated
  const showPublicTopNav = !isAuthenticated && !isAuthRoute

  const navigationItems = useMemo(
    () =>
      buildNavigationItems({
        role,
        isAuthenticated,
        notificationCount,
      }),
    [isAuthenticated, notificationCount, role],
  )

  useEffect(() => {
    let active = true

    const run = async () => {
      if (!userId) {
        setNotificationCount(0)
        return
      }

      try {
        const unreadCount = await notificationsService.countUnreadNotifications({
          userId,
        })

        if (active) {
          setNotificationCount(unreadCount)
        }
      } catch {
        if (active) {
          setNotificationCount(0)
        }
      }
    }

    run()

    return () => {
      active = false
    }
  }, [setNotificationCount, userId])

  useEffect(() => {
    if (!userId) {
      return undefined
    }

    const channel = `databases.${databaseId}.collections.${collections.notifications}.documents`
    const unsubscribe = realtimeService.subscribe([channel], async (event) => {
      if (!event?.payload?.$id || event.payload.userId !== userId) {
        return
      }

      try {
        const unreadCount = await notificationsService.countUnreadNotifications({
          userId,
        })
        setNotificationCount(unreadCount)
      } catch {
        setNotificationCount(0)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [setNotificationCount, userId])

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return undefined
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isMobileSidebarOpen])

  useEffect(
    () => () => {
      if (publicMenuCloseTimeoutRef.current) {
        window.clearTimeout(publicMenuCloseTimeoutRef.current)
      }
    },
    [],
  )

  const cancelPublicMenuClose = () => {
    if (publicMenuCloseTimeoutRef.current) {
      window.clearTimeout(publicMenuCloseTimeoutRef.current)
      publicMenuCloseTimeoutRef.current = null
    }
  }

  const closePublicMenu = () => {
    cancelPublicMenuClose()
    setOpenPublicMenuId('')
  }

  const schedulePublicMenuClose = () => {
    cancelPublicMenuClose()
    publicMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setOpenPublicMenuId('')
      publicMenuCloseTimeoutRef.current = null
    }, 200)
  }

  const openPublicMenu = (menuId) => {
    cancelPublicMenuClose()
    setOpenPublicMenuId(menuId)
  }

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileSidebarOpen])

  const onLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/listings', { replace: true })
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {shouldShowSidebar && (
              <button
                aria-expanded={isMobileSidebarOpen}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 md:hidden"
                onClick={() => setIsMobileSidebarOpen(true)}
                type="button"
              >
                <span className="sr-only">Open navigation</span>
                <IconMenu />
              </button>
            )}
            <Link className="text-lg font-bold text-brand-900" to={isAuthenticated ? '/listings' : '/'}>
              NyumbaSmart
            </Link>
            {showPublicTopNav && (
              <nav className="hidden items-center gap-4 pl-3 md:flex">
                {publicMarketNavItems.map((item) => (
                  <div
                    className="relative"
                    key={item.id}
                    onMouseEnter={() => openPublicMenu(item.id)}
                    onMouseLeave={schedulePublicMenuClose}
                  >
                    <button
                      aria-expanded={openPublicMenuId === item.id}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      onClick={() => (openPublicMenuId === item.id ? closePublicMenu() : openPublicMenu(item.id))}
                      type="button"
                    >
                      {item.label}
                      <svg aria-hidden className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>

                    <div
                      className={`absolute left-0 top-full z-50 w-40 pt-2 transition ${
                        openPublicMenuId === item.id ? 'visible opacity-100' : 'invisible opacity-0'
                      }`}
                      onMouseEnter={cancelPublicMenuClose}
                    >
                      <div className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        {item.submenu.map((submenuItem) => (
                          <Link
                            className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                            key={submenuItem.to}
                            onClick={closePublicMenu}
                            to={submenuItem.to}
                          >
                            {submenuItem.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                <a
                  className="rounded-md px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  href={appConfig.manageRentalsUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Manage Rentals
                </a>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="hidden text-right sm:block">
                  <p className="text-xs font-semibold text-slate-800">{user?.email}</p>
                  {appConfig.enableEmailVerification && (
                    <p className="text-xs text-slate-500">{isEmailVerified ? 'Verified' : 'Not verified'}</p>
                  )}
                </div>
                {appConfig.enableEmailVerification && !isEmailVerified && (
                  <Link
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
                    to="/auth/verify"
                  >
                    Verify email
                  </Link>
                )}
                <button
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={onLogout}
                  type="button"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800" to="/auth/login">
                Sign In
              </Link>
            )}
          </div>
        </div>
        {showPublicTopNav && (
          <div className="border-t border-slate-200 px-4 py-2 md:hidden">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto">
              {publicMarketNavItems.flatMap((item) =>
                item.submenu.map((submenuItem) => (
                  <Link className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700" key={`${item.id}-${submenuItem.to}`} to={submenuItem.to}>
                    {item.label}: {submenuItem.label}
                  </Link>
                )),
              )}
              <a
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                href={appConfig.manageRentalsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Manage Rentals
              </a>
            </div>
          </div>
        )}
      </header>

      {shouldShowSidebar && isMobileSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-slate-900/50 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
          type="button"
        />
      )}

      {isAuthRoute ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      ) : !shouldShowSidebar ? (
        <main className={`mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 ${isListingsRoute ? 'max-w-none' : 'max-w-7xl'}`}>
          <div className={`mx-auto w-full ${isListingsRoute ? '' : 'max-w-6xl'}`}>
            <Outlet />
          </div>
        </main>
      ) : (
        <div className="mx-auto flex w-full max-w-7xl gap-0">
          <aside
            className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-800 bg-[#0f172a] shadow-2xl transition-all duration-200 md:sticky md:top-16 md:z-10 md:h-[calc(100vh-4rem)] md:translate-x-0 md:shadow-none ${
              isSidebarCollapsed ? 'md:w-20' : 'md:w-72'
            } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3">
              {!isSidebarCollapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">Workspace</p>
                  <p className="text-xs text-slate-400">{role ? `${role} view` : 'Public view'}</p>
                </div>
              ) : (
                <div className="h-8 w-8 rounded-lg bg-brand-500/20" />
              )}
              <div className="flex items-center gap-2">
                <button
                  className="hidden h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:inline-flex"
                  onClick={() => setIsSidebarCollapsed((previous) => !previous)}
                  type="button"
                >
                  <span className="sr-only">{isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}</span>
                  {isSidebarCollapsed ? <IconChevronRight /> : <IconChevronLeft />}
                </button>
                <button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 md:hidden"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  type="button"
                >
                  <span className="sr-only">Close navigation</span>
                  <IconClose />
                </button>
              </div>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navigationItems.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    sidebarLinkClass({
                      isActive,
                      collapsed: isSidebarCollapsed,
                    })
                  }
                  key={item.to}
                  onClick={closeMobileSidebar}
                  title={isSidebarCollapsed ? item.label : undefined}
                  to={item.to}
                >
                  {isSidebarCollapsed ? (
                    <div className="relative">
                      {renderNavIcon(item.icon)}
                      {item.badge ? <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-400" /> : null}
                    </div>
                  ) : (
                    <>
                      <span className="shrink-0">{renderNavIcon(item.icon)}</span>
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="ml-auto rounded-full bg-brand-500/30 px-2 py-0.5 text-xs font-bold text-brand-50">{item.badge}</span>
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            {isAuthenticated && (
              <div className={`border-t border-slate-800 p-3 ${isSidebarCollapsed ? 'text-center' : ''}`}>
                {isSidebarCollapsed ? (
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-100">
                    {toShortLabel(user?.email || 'U')}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2">
                    <p className="truncate text-xs font-semibold text-slate-100">{user?.email}</p>
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">{role || 'user'}</p>
                  </div>
                )}
              </div>
            )}
          </aside>

          <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      )}

      {isAuthenticated && role && (
        <footer className="mx-auto mb-6 w-full max-w-7xl px-4 text-right text-xs text-slate-500 sm:px-6 lg:px-8">
          Signed in as {role}. Default route: {getPostLoginRoute(role)}
        </footer>
      )}
    </div>
  )
}
