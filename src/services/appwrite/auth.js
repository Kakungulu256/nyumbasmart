import { Account, ID, OAuthProvider } from 'appwrite'

import { appConfig } from '@/constants/appConfig'
import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'

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
    return account.create(ID.unique(), email, password, name)
  },

  loginWithEmail: async ({ email, password }) => {
    ensureAppwriteConfigured()
    return account.createEmailPasswordSession(email, password)
  },

  startGoogleOAuth: ({ successUrl, failureUrl, scopes = [] }) => {
    ensureAppwriteConfigured()
    account.createOAuth2Session(OAuthProvider.Google, successUrl, failureUrl, scopes)
  },

  getCurrentUser: async () => {
    ensureAppwriteConfigured()
    return account.get()
  },

  getCurrentSession: async () => {
    ensureAppwriteConfigured()
    return account.getSession('current')
  },

  logoutCurrentSession: async () => {
    ensureAppwriteConfigured()
    return account.deleteSession('current')
  },

  requestPasswordRecovery: async ({ email, redirectUrl }) => {
    ensureAppwriteConfigured()
    return account.createRecovery(email, redirectUrl)
  },

  confirmPasswordRecovery: async ({ userId, secret, password }) => {
    ensureAppwriteConfigured()
    return account.updateRecovery(userId, secret, password, password)
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
        throw error
      }

      return callLegacyVerificationEndpoint({
        method: 'POST',
        path: '/account/verification',
        payload: { url: redirectUrl },
      })
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
        throw error
      }

      return callLegacyVerificationEndpoint({
        method: 'PUT',
        path: '/account/verification',
        payload: { userId, secret },
      })
    }
  },
}
