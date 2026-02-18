import { useAuth } from '@/hooks/useAuth'

export function FeatureGuard({ allowedRoles = [], children, fallback = null }) {
  const { authStatus, isAuthenticated, role } = useAuth()

  if (authStatus === 'loading') {
    return null
  }

  if (!isAuthenticated || !role) {
    return fallback
  }

  if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
    return children
  }

  return fallback
}
