function readEnv(key, fallback = '') {
  const rawValue = import.meta.env[key]

  if (typeof rawValue !== 'string') {
    return fallback
  }

  const value = rawValue.trim()
  return value || fallback
}

export const appConfig = {
  appName: 'NyumbaSmart',
  appwriteEndpoint: readEnv('VITE_APPWRITE_ENDPOINT', 'https://cloud.appwrite.io/v1'),
  appwriteProjectId: readEnv('VITE_APPWRITE_PROJECT_ID'),
  appwriteDatabaseId: readEnv('VITE_APPWRITE_DATABASE_ID'),
}

const requiredConfig = [
  ['VITE_APPWRITE_ENDPOINT', appConfig.appwriteEndpoint],
  ['VITE_APPWRITE_PROJECT_ID', appConfig.appwriteProjectId],
  ['VITE_APPWRITE_DATABASE_ID', appConfig.appwriteDatabaseId],
]

export const missingAppwriteConfigKeys = requiredConfig
  .filter(([, value]) => !value)
  .map(([key]) => key)

export const hasRequiredAppwriteConfig = missingAppwriteConfigKeys.length === 0

export function assertAppwriteConfig() {
  if (hasRequiredAppwriteConfig) {
    return
  }

  throw new Error(
    `Missing Appwrite environment configuration: ${missingAppwriteConfigKeys.join(', ')}. ` +
      'Copy .env.example to .env and set these values.',
  )
}
