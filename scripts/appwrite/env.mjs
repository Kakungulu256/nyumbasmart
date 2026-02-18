function firstValue(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return ''
}

export function readConfig() {
  const endpoint = firstValue(process.env.APPWRITE_ENDPOINT, process.env.VITE_APPWRITE_ENDPOINT)
  const projectId = firstValue(process.env.APPWRITE_PROJECT_ID, process.env.VITE_APPWRITE_PROJECT_ID)
  const apiKey = firstValue(process.env.APPWRITE_API_KEY)
  const databaseId = firstValue(process.env.APPWRITE_DATABASE_ID, process.env.VITE_APPWRITE_DATABASE_ID)

  const missing = []

  if (!endpoint) missing.push('APPWRITE_ENDPOINT (or VITE_APPWRITE_ENDPOINT)')
  if (!projectId) missing.push('APPWRITE_PROJECT_ID (or VITE_APPWRITE_PROJECT_ID)')
  if (!apiKey) missing.push('APPWRITE_API_KEY')
  if (!databaseId) missing.push('APPWRITE_DATABASE_ID (or VITE_APPWRITE_DATABASE_ID)')

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }

  if (apiKey === 'replace-with-server-api-key') {
    throw new Error(
      'APPWRITE_API_KEY is still the placeholder value. Create a Server API key in Appwrite Console with at least databases.read and databases.write scopes, then set it in .env.',
    )
  }

  return {
    endpoint,
    projectId,
    apiKey,
    databaseId,
  }
}

export function readSchemaIds() {
  return {
    collections: {
      users: firstValue(process.env.APPWRITE_COLLECTION_USERS_ID, process.env.VITE_COLLECTION_USERS_ID, 'users'),
      listings: firstValue(process.env.APPWRITE_COLLECTION_LISTINGS_ID, process.env.VITE_COLLECTION_LISTINGS_ID, 'listings'),
      applications: firstValue(
        process.env.APPWRITE_COLLECTION_APPLICATIONS_ID,
        process.env.VITE_COLLECTION_APPLICATIONS_ID,
        'applications',
      ),
      leases: firstValue(process.env.APPWRITE_COLLECTION_LEASES_ID, process.env.VITE_COLLECTION_LEASES_ID, 'leases'),
      payments: firstValue(process.env.APPWRITE_COLLECTION_PAYMENTS_ID, process.env.VITE_COLLECTION_PAYMENTS_ID, 'payments'),
      maintenanceTickets: firstValue(
        process.env.APPWRITE_COLLECTION_MAINTENANCE_TICKETS_ID,
        process.env.VITE_COLLECTION_MAINTENANCE_TICKETS_ID,
        'maintenanceTickets',
      ),
      messages: firstValue(process.env.APPWRITE_COLLECTION_MESSAGES_ID, process.env.VITE_COLLECTION_MESSAGES_ID, 'messages'),
      notifications: firstValue(
        process.env.APPWRITE_COLLECTION_NOTIFICATIONS_ID,
        process.env.VITE_COLLECTION_NOTIFICATIONS_ID,
        'notifications',
      ),
    },
    buckets: {
      listingImages: firstValue(
        process.env.APPWRITE_BUCKET_LISTING_IMAGES_ID,
        process.env.VITE_BUCKET_LISTING_IMAGES_ID,
        'listingImages',
      ),
      leaseDocuments: firstValue(
        process.env.APPWRITE_BUCKET_LEASE_DOCUMENTS_ID,
        process.env.VITE_BUCKET_LEASE_DOCUMENTS_ID,
        'leaseDocuments',
      ),
      tenantDocuments: firstValue(
        process.env.APPWRITE_BUCKET_TENANT_DOCUMENTS_ID,
        process.env.VITE_BUCKET_TENANT_DOCUMENTS_ID,
        'tenantDocuments',
      ),
      receipts: firstValue(
        process.env.APPWRITE_BUCKET_RECEIPTS_ID,
        process.env.VITE_BUCKET_RECEIPTS_ID,
        'receipts',
      ),
      avatars: firstValue(
        process.env.APPWRITE_BUCKET_AVATARS_ID,
        process.env.VITE_BUCKET_AVATARS_ID,
        'avatars',
      ),
    },
  }
}
