import { Client } from 'appwrite'

import {
  appConfig,
  assertAppwriteConfig,
  hasRequiredAppwriteConfig,
  missingAppwriteConfigKeys,
} from '@/constants/appConfig'

export const appwriteClient = new Client().setEndpoint(appConfig.appwriteEndpoint)

if (appConfig.appwriteProjectId) {
  appwriteClient.setProject(appConfig.appwriteProjectId)
}

if (import.meta.env.DEV && !hasRequiredAppwriteConfig) {
  // Surface setup gaps early during local development.
  console.warn(
    `[Appwrite] Missing environment keys: ${missingAppwriteConfigKeys.join(', ')}. ` +
      'Create a .env file from .env.example.',
  )
}

export function ensureAppwriteConfigured() {
  assertAppwriteConfig()
}
