import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '@/hooks/useAuth'

function AuthLoading() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-6xl items-center justify-center px-6 py-12">
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">Loading session...</p>
    </div>
  )
}

export function ProtectedRoute({ children, requireVerified = false }) {
  const location = useLocation()
  const { authStatus, isAuthenticated, isEmailVerified } = useAuth()

  if (authStatus === 'loading') {
    return <AuthLoading />
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />
  }

  if (requireVerified && !isEmailVerified) {
    return <Navigate to="/auth/verify" replace />
  }

  return children
}
