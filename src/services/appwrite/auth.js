import { Account, ID, OAuthProvider } from 'appwrite'

import { appConfig } from '@/constants/appConfig'
import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'
import { normalizeAppwriteError } from '@/services/appwrite/errors'

export const account = new Account(appwriteClient)

function isNotFoundError(error) {
  return Number(error?.code) === 404
}

function buildEndpoint(path) {
  return `${appwriteClient.config.endpoint.replace(/\/+$/, '')}${path}`
}

async function callLegacyVerificationEndpoint({ method, path, payload }) {
  return appwriteClient.call(method, new URL(buildEndpoint(path)), { 'content-type': 'application/json' }, payload)
}

export const authService = {
  registerWithEmail: async ({ email, password, name }) => {
    ensureAppwriteConfigured()
    try {
      return await account.create(ID.unique(), email, password, name)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to create account.')
    }
  },

  loginWithEmail: async ({ email, password }) => {
    ensureAppwriteConfigured()
    try {
      return await account.createEmailPasswordSession(email, password)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to log in.')
    }
  },

  startGoogleOAuth: ({ successUrl, failureUrl, scopes = [] }) => {
    ensureAppwriteConfigured()
    account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl, scopes)
  },

  getCurrentUser: async () => {
    ensureAppwriteConfigured()
    try {
      return await account.get()
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to load user profile.')
    }
  },

  getCurrentSession: async () => {
    ensureAppwriteConfigured()
    try {
      return await account.getSession('current')
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to load session.')
    }
  },

  logoutCurrentSession: async () => {
    ensureAppwriteConfigured()
    try {
      return await account.deleteSession('current')
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to log out.')
    }
  },

  requestPasswordRecovery: async ({ email, redirectUrl }) => {
    ensureAppwriteConfigured()
    try {
      return await account.createRecovery(email, redirectUrl)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to start password recovery.')
    }
  },

  confirmPasswordRecovery: async ({ userId, secret, password }) => {
    ensureAppwriteConfigured()
    try {
      return await account.updateRecovery(userId, secret, password, password)
    } catch (error) {
      throw normalizeAppwriteError(error, 'Unable to reset password.')
    }
  },

  requestEmailVerification: async ({ redirectUrl }) => {
    ensureAppwriteConfigured()
    if (!appConfig.enableEmailVerification) {
      return { $id: 'email-verification-disabled', userId: null, secret: null, expire: null }
    }

    try {
      return await account.createVerification({ url: redirectUrl })
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw normalizeAppwriteError(error, 'Unable to request email verification.')
      }

      try {
        return await callLegacyVerificationEndpoint({
          method: 'POST',
          path: '/account/verification',
          payload: { url: redirectUrl },
        })
      } catch (legacyError) {
        throw normalizeAppwriteError(legacyError, 'Unable to request email verification.')
      }
    }
  },

  confirmEmailVerification: async ({ userId, secret }) => {
    ensureAppwriteConfigured()
    if (!appConfig.enableEmailVerification) {
      return { $id: 'email-verification-disabled', userId, secret, expire: null }
    }

    try {
      return await account.updateVerification({ userId, secret })
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw normalizeAppwriteError(error, 'Unable to verify email.')
      }

      try {
        return await callLegacyVerificationEndpoint({
          method: 'PUT',
          path: '/account/verification',
          payload: { userId, secret },
        })
      } catch (legacyError) {
        throw normalizeAppwriteError(legacyError, 'Unable to verify email.')
      }
    }
  },
}
