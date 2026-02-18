import { Permission, Role } from 'appwrite'
import { useCallback, useMemo } from 'react'

import { collections } from '@/constants/collections'
import { authService } from '@/services/appwrite/auth'
import { dbService, Query } from '@/services/appwrite/db'
import { useAppStore } from '@/store/appStore'

function isUnauthorized(error) {
  return error?.code === 401 || error?.type === 'user_unauthorized' || error?.type === 'user_unauthenticated'
}

function isConflict(error) {
  return error?.code === 409 || error?.type === 'document_already_exists'
}

function buildProfilePermissions(userId) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

async function fetchProfile(userId) {
  try {
    const response = await dbService.listDocuments({
      collectionId: collections.users,
      queries: [Query.equal('userId', userId), Query.limit(1)],
    })

    return response.documents[0] ?? null
  } catch (error) {
    // During bootstrap the collection may not exist yet in local setup.
    if (error?.code === 404) {
      return null
    }

    throw error
  }
}

export function useAuth() {
  const authStatus = useAppStore((state) => state.authStatus)
  const user = useAppStore((state) => state.user)
  const profile = useAppStore((state) => state.profile)
  const role = useAppStore((state) => state.role)

  const setAuthStatus = useAppStore((state) => state.setAuthStatus)
  const setSession = useAppStore((state) => state.setSession)
  const clearSession = useAppStore((state) => state.clearSession)

  const refreshSession = useCallback(async () => {
    setAuthStatus('loading')

    try {
      const currentUser = await authService.getCurrentUser()
      const currentProfile = await fetchProfile(currentUser.$id)

      setSession({ user: currentUser, profile: currentProfile })
      setAuthStatus('ready')

      return {
        user: currentUser,
        profile: currentProfile,
      }
    } catch (error) {
      if (isUnauthorized(error)) {
        clearSession()
        setAuthStatus('ready')
        return null
      }

      clearSession()
      setAuthStatus('ready')
      throw error
    }
  }, [clearSession, setAuthStatus, setSession])

  const logout = useCallback(async () => {
    try {
      await authService.logoutCurrentSession()
    } catch (error) {
      if (!isUnauthorized(error)) {
        throw error
      }
    } finally {
      clearSession()
      setAuthStatus('ready')
    }
  }, [clearSession, setAuthStatus])

  const createProfile = useCallback(async (payload) => {
    const existingProfile = await fetchProfile(payload.userId)

    if (existingProfile) {
      return existingProfile
    }

    const data = {
      userId: payload.userId,
      role: payload.role,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.phone,
      country: payload.country,
      city: payload.city ?? '',
      verifiedKYC: false,
      createdAt: new Date().toISOString(),
    }

    try {
      return await dbService.createDocument({
        collectionId: collections.users,
        data,
        permissions: buildProfilePermissions(payload.userId),
      })
    } catch (error) {
      if (!isConflict(error)) {
        throw error
      }

      const profileAfterConflict = await fetchProfile(payload.userId)

      if (profileAfterConflict) {
        return profileAfterConflict
      }

      if (String(error?.message || '').includes('users_phone_uq')) {
        throw new Error('This phone number is already used by another account.')
      }

      throw error
    }
  }, [])

  return useMemo(
    () => ({
      authStatus,
      user,
      profile,
      role,
      isAuthenticated: Boolean(user),
      isEmailVerified: Boolean(user?.emailVerification),
      refreshSession,
      logout,
      createProfile,
    }),
    [authStatus, createProfile, logout, profile, refreshSession, role, user],
  )
}
