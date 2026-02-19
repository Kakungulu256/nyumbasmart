import { Client, Databases, ID, Permission, Role } from 'node-appwrite'

const VALID_TYPES = [
  'application_new',
  'application_accepted',
  'application_rejected',
  'lease_signature_needed',
  'lease_signed',
  'payment_request',
  'payment_confirmed',
  'payment_overdue',
  'lease_expiry',
  'maintenance_new',
  'maintenance_updated',
  'message_new',
]

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

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export default async ({ req, res, log, error }) => {
  if (req.method !== 'POST') {
    return res.json({ ok: false, message: 'Method not allowed.' }, 405)
  }

  const payload = parsePayload(req)
  const userId = String(payload.userId || '').trim()
  const type = String(payload.type || '').trim()
  const title = String(payload.title || '').trim()
  const body = String(payload.body || '').trim()
  const channels = Array.isArray(payload.channels) && payload.channels.length > 0 ? payload.channels : ['in_app']
  const persistInApp = payload.persistInApp !== false

  if (!isNonEmptyString(userId) || !isNonEmptyString(type) || !isNonEmptyString(title) || !isNonEmptyString(body)) {
    return res.json({ ok: false, message: 'userId, type, title, and body are required.' }, 400)
  }

  if (!VALID_TYPES.includes(type)) {
    return res.json({ ok: false, message: 'Notification type is invalid.' }, 400)
  }

  const databaseId = readEnv('APPWRITE_DATABASE_ID')
  const notificationsCollectionId = readEnv('NOTIFICATIONS_COLLECTION_ID', 'notifications')
  let notificationId = String(payload.notificationId || '').trim()

  try {
    if (persistInApp) {
      if (!databaseId) {
        return res.json({ ok: false, message: 'APPWRITE_DATABASE_ID is required for in-app persistence.' }, 400)
      }

      const databases = new Databases(createAdminClient())
      const created = await databases.createDocument(
        databaseId,
        notificationsCollectionId,
        notificationId || ID.unique(),
        {
          userId,
          type,
          title,
          body,
          channels,
          status: 'unread',
          entityType: payload.entityType ? String(payload.entityType).slice(0, 40) : null,
          entityId: payload.entityId ? String(payload.entityId).slice(0, 64) : null,
          sentAt: payload.sentAt || new Date().toISOString(),
          createdAt: new Date().toISOString(),
        },
        [Permission.read(Role.user(userId)), Permission.update(Role.user(userId)), Permission.delete(Role.user(userId))],
      )

      notificationId = created.$id
    }

    if (channels.some((channel) => channel !== 'in_app')) {
      log(`External channel dispatch placeholder for userId=${userId} channels=${channels.join(',')}`)
    }
  } catch (createError) {
    error(`sendNotification failed: ${createError?.message || createError}`)
    return res.json({ ok: false, message: 'Unable to process notification request.' }, 500)
  }

  return res.json(
    {
      ok: true,
      message: 'Notification processed.',
      notificationId: notificationId || null,
      persistedInApp: persistInApp,
      channels,
    },
    200,
  )
}


