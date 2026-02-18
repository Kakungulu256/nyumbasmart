import { useMemo } from 'react'

import { useAppStore } from '@/store/appStore'

export function useAuth() {
  const user = useAppStore((state) => state.user)
  const role = useAppStore((state) => state.role)

  return useMemo(
    () => ({
      user,
      role,
      isAuthenticated: Boolean(user),
    }),
    [role, user],
  )
}
