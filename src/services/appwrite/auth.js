import { Account, ID, OAuthProvider } from 'appwrite'

import { ensureAppwriteConfigured, appwriteClient } from '@/services/appwrite/client'

export const account = new Account(appwriteClient)

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
    return account.createVerification(redirectUrl)
  },

  confirmEmailVerification: async ({ userId, secret }) => {
    ensureAppwriteConfigured()
    return account.updateVerification(userId, secret)
  },
}
