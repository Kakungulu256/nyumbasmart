import { Navigate, useLocation } from 'react-router-dom'

import { appConfig } from '@/constants/appConfig'
import { getPostLoginRoute } from '@/features/auth/utils/authMessages'
import { useAuth } from '@/hooks/useAuth'

function AuthLoading() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-6 py-12">
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading session...</p>
    </div>
  )
}

export function ProtectedRoute({ children, requireVerified = false, allowedRoles = [] }) {
  const location = useLocation()
  const { authStatus, isAuthenticated, isEmailVerified, role } = useAuth()

  if (authStatus === 'loading') {
    return <AuthLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  if (requireVerified && appConfig.enableEmailVerification && !isEmailVerified) {
    return <Navigate to="/auth/verify" replace />
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    const fallback = getPostLoginRoute(role)
    const destination = fallback === location.pathname ? '/listings' : fallback
    return <Navigate to={destination} replace />
  }

  return children
}
