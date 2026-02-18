import { useEffect } from 'react'

import { useAuth } from '@/hooks/useAuth'

export function useAuthBootstrap() {
  const { refreshSession } = useAuth()

  useEffect(() => {
    let active = true

    const bootstrap = async () => {
      try {
        if (!active) {
          return
        }

        await refreshSession()
      } catch (error) {
        console.error('[auth] bootstrap failed', error)
      }
    }

    bootstrap()

    return () => {
      active = false
    }
  }, [refreshSession])
}
