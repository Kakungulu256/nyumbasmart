import { Client, Databases, ID, Permission, Query, Role } from 'node-appwrite'

function parsePayload(req) {
  const rawBody = req?.body

  if (!rawBody) {
    return {}
  }

  if (typeof rawBody === 'object') {
    return rawBody
  }

  try {
    return JSON.parse(rawBody)
  } catch {
    return {}
  }
}

function readEnv(name, fallback = '') {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function createAdminClient() {
  const endpoint = readEnv('APPWRITE_FUNCTION_API_ENDPOINT', readEnv('APPWRITE_ENDPOINT'))
  const projectId = readEnv('APPWRITE_FUNCTION_PROJECT_ID', readEnv('APPWRITE_PROJECT_ID'))
  const apiKey = readEnv('APPWRITE_API_KEY')

  if (!endpoint || !projectId || !apiKey) {
    throw new Error('Missing Appwrite environment configuration for function runtime.')
  }

  return new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
}

function toTime(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

async function createNotification(databases, databaseId, notificationsCollectionId, userId, body) {
  if (!userId) {
    return false
  }

  await databases.createDocument(
    databaseId,
    notificationsCollectionId,
    ID.unique(),
    {
      userId,
      type: 'lease_expiry',
      title: 'Lease expiry reminder',
      body,
      channels: ['in_app'],
      status: 'unread',
      entityType: 'lease',
      entityId: null,
      sentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
  )

  return true
}

export default async ({ req, res, log, error }) => {
  if (!['POST', 'GET'].includes(req.method)) {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const payload = parsePayload(req)
  const daysAhead = Math.max(1, Math.min(90, Number(payload.daysAhead || 14)))
  const databaseId = readEnv('APPWRITE_DATABASE_ID')
  const leasesCollectionId = readEnv('LEASES_COLLECTION_ID', 'leases')
  const notificationsCollectionId = readEnv('NOTIFICATIONS_COLLECTION_ID', 'notifications')

  if (!databaseId) {
    return res.json({ ok: false, message: 'APPWRITE_DATABASE_ID is required.' }, 400)
  }

  const now = Date.now()
  const maxWindow = now + daysAhead * 24 * 60 * 60 * 1000
  let remindersCreated = 0

  try {
    const databases = new Databases(createAdminClient())
    const leasesResponse = await databases.listDocuments(databaseId, leasesCollectionId, [Query.equal('status', 'active'), Query.limit(500)])

    for (const lease of leasesResponse.documents) {
      const endTime = toTime(lease.endDate)
      if (!endTime || endTime < now || endTime > maxWindow) {
        continue
      }

      const endDateLabel = new Date(endTime).toLocaleDateString('en-US')
      const body = `Your lease is ending on ${endDateLabel}. Please review renewal options.`

      if (await createNotification(databases, databaseId, notificationsCollectionId, lease.tenantId, body)) {
        remindersCreated += 1
      }

      if (await createNotification(databases, databaseId, notificationsCollectionId, lease.landlordId, body)) {
        remindersCreated += 1
      }
    }
  } catch (executionError) {
    error(`leaseExpiryReminder failed: ${executionError?.message || executionError}`)
    return res.json({ ok: false, message: 'Lease reminder execution failed.' }, 500)
  }

  log(`leaseExpiryReminder completed with remindersCreated=${remindersCreated}`)
  return res.json({ ok: true, daysAhead, remindersCreated }, 200)
}


