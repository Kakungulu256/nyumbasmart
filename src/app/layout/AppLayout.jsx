import toast from 'react-hot-toast'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'

import { appConfig } from '@/constants/appConfig'
import { getPostLoginRoute } from '@/features/auth/utils/authMessages'
import { useAuth } from '@/hooks/useAuth'

function linkClass({ isActive }) {
  return `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-brand-700 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`
}

export function AppLayout() {
  const navigate = useNavigate()
  const { isAuthenticated, isEmailVerified, role, user, logout } = useAuth()

  const onLogout = async () => {
    await logout()
    toast.success('Logged out')
    navigate('/auth/login', { replace: true })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link className="text-lg font-bold text-brand-900" to="/listings">
              NyumbaSmart
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink className={linkClass} to="/listings">
                Listings
              </NavLink>
              {role === 'landlord' && (
                <NavLink className={linkClass} to="/dashboard/landlord">
                  Landlord Dashboard
                </NavLink>
              )}
              {role === 'landlord' && (
                <NavLink className={linkClass} to="/dashboard/landlord/listings">
                  Manage Listings
                </NavLink>
              )}
              {role === 'landlord' && (
                <NavLink className={linkClass} to="/dashboard/landlord/applications">
                  Applications
                </NavLink>
              )}
              {role === 'tenant' && (
                <NavLink className={linkClass} to="/dashboard/tenant">
                  Tenant Dashboard
                </NavLink>
              )}
              {role === 'tenant' && (
                <NavLink className={linkClass} to="/dashboard/tenant/applications">
                  My Applications
                </NavLink>
              )}
              {isAuthenticated && (
                <NavLink className={linkClass} to="/messages">
                  Messages
                </NavLink>
              )}
              {role === 'tenant' && (
                <NavLink className={linkClass} to="/payments">
                  Payments
                </NavLink>
              )}
            </nav>
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
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={onLogout}
                  type="button"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100" to="/auth/login">
                  Login
                </Link>
                <Link className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-900" to="/auth/register">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      {isAuthenticated && role && (
        <footer className="mx-auto mb-6 w-full max-w-6xl px-4 text-right text-xs text-slate-500 sm:px-6">
          Signed in as {role}. Default route: {getPostLoginRoute(role)}
        </footer>
      )}
    </div>
  )
}
